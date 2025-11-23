import path from "node:path";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";

export class FileLoadingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomError";
    Object.setPrototypeOf(this, FileLoadingError.prototype);
  }
}

export type InputFile = {
  name: string;
  path: string;
};

export type ImportedFile<T = string> = InputFile & {
  content: T;
};

function _processPath(input: string) {
  // Absolute path - Return normalized path
  if (path.isAbsolute(input)) {
    return path.normalize(input);
  }

  // Relative path - Return resolved path
  return path.resolve(process.cwd(), input);
}

export async function getBenchmarkFiles(
  inputPath: string,
): Promise<InputFile[]> {
  const processedPath = _processPath(inputPath);

  if (!existsSync(processedPath))
    throw new FileLoadingError(
      `Incorrect path - does not exist: ${processedPath}`,
    );

  const pathStats = await fs.lstat(processedPath);
  if (pathStats.isDirectory()) {
    let files = await fs
      .readdir(processedPath)
      .then((files) => files.filter((f) => f.endsWith(".json")));

    if (files.length < 1)
      throw new FileLoadingError(
        `Folder does not contain any files - ${processedPath}`,
      );

    return files.map((file) => {
      const filePath = path.join(processedPath, file);
      return {
        name: file,
        path: filePath,
      };
    });
  } else if (pathStats.isFile()) {
    if (!inputPath.endsWith(".json"))
      throw new FileLoadingError("Path does not point to a json file");

    return [
      {
        name: path.basename(processedPath),
        path: processedPath,
      },
    ];
  }

  throw new FileLoadingError(
    `Path does not point to a file or folder - ${inputPath}`,
  );
}

export async function loadFile(
  inputFile: InputFile,
): Promise<ImportedFile<string>> {
  return {
    ...inputFile,
    content: await fs.readFile(inputFile.path, "utf8"),
  };
}

export function groupFiles(
  files: InputFile[],
): Record<string, Record<string, InputFile[]>> {
  // Record<BenchmarkName, Record<Framework, List of runs>>
  const benchmarks: Record<string, Record<string, InputFile[]>> = {};
  for (const file of files) {
    const [framework, benchmark, iteration] = file.name.split("_");

    if (!iteration || !benchmark || !framework)
      throw new Error(
        "Invalid filename - Does not follow convention 'framework_benchmark_iteration'",
      );

    // Create object and list if necessary and add file
    (benchmarks[benchmark] ??= {})[framework] ??= [];
    benchmarks[benchmark][framework].push(file);
  }

  return benchmarks;
}

export async function getResultsPath(
  inputPath: string,
  folderName: string = "processed-results",
): Promise<string> {
  const processedPath = _processPath(inputPath);

  const pathStats = await fs.lstat(processedPath);
  const resultsPath = pathStats.isDirectory()
    ? path.join(processedPath, `/${folderName}`)
    : pathStats.isFile()
      ? path.resolve(processedPath, "../")
      : undefined;

  if (resultsPath === undefined)
    throw new Error(
      `Path does not point to a folder or a file: ${processedPath}`,
    );

  if (!existsSync(resultsPath)) fs.mkdir(resultsPath);

  return resultsPath;
}

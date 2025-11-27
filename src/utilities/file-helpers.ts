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

export function getAbsolutePath(input: string) {
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
  const processedPath = getAbsolutePath(inputPath);

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
    const [benchmark, framework, iteration] = file.name.split("_");

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

interface ResultsPathProps {
  inputPath: string;
  resultsFolderName: string;
  summedResultsFolderName: string;
  rawResultsFolderName?: string;
}

export async function getResultsPaths({
  inputPath,
  resultsFolderName,
  summedResultsFolderName,
  rawResultsFolderName,
}: ResultsPathProps): Promise<[string, string, string | undefined]> {
  const absoluteInputPath = getAbsolutePath(inputPath);

  const pathStats = await fs.lstat(absoluteInputPath);
  const resultsPath = pathStats.isDirectory()
    ? path.join(absoluteInputPath, `/${resultsFolderName}`)
    : pathStats.isFile()
      ? path.resolve(absoluteInputPath, "../")
      : undefined;

  if (resultsPath === undefined)
    throw new Error(`Path does not point to a folder or a file: ${inputPath}`);

  if (!existsSync(resultsPath)) await fs.mkdir(resultsPath);

  // Total results path
  const totalResultsPath = path.join(resultsPath, summedResultsFolderName);
  if (!existsSync(totalResultsPath)) await fs.mkdir(totalResultsPath);

  // Raw results path
  const rawResultsPath = rawResultsFolderName
    ? path.join(resultsPath, rawResultsFolderName)
    : undefined;

  if (rawResultsPath && !existsSync(rawResultsPath))
    await fs.mkdir(rawResultsPath);

  return [resultsPath, totalResultsPath, rawResultsPath];
}

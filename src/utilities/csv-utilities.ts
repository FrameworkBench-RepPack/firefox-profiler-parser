import fs from "node:fs";

type WriteCsvInput = {
  path: string;
  header: string[];
  fields: (number | string)[][];
};

export function writeCSV(input: WriteCsvInput) {
  let outputBuffer: string = "";

  input.header.forEach((column, index) => {
    outputBuffer += `${column.replace(",", "_")}`;
    if (index !== input.header.length - 1) outputBuffer += ",";
  });

  outputBuffer += "\n";
  for (const row of input.fields) {
    if (row.length !== input.header.length)
      throw new Error(
        "Row does not contain the correct amount elements: " + row,
      );

    row.forEach((value, index) => {
      outputBuffer += value;
      if (index !== row.length - 1) outputBuffer += ",";
    });

    outputBuffer += "\n";
  }

  fs.writeFileSync(input.path, outputBuffer);
}

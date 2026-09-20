import { Readable } from "node:stream";

import csv from "csv-parser";

export const parseEmailCsv = (buffer: Buffer): Promise<string[]> =>
  new Promise((resolve, reject) => {
    const emails = new Set<string>();

    Readable.from(buffer)
      .pipe(csv())
      .on("data", (row: Record<string, unknown>) => {
        const email = row.email;
        if (typeof email === "string" && email.trim()) {
          emails.add(email.trim().toLowerCase());
        }
      })
      .on("error", reject)
      .on("end", () => resolve([...emails]));
  });

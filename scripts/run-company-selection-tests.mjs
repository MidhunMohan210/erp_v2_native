import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const outputDirectory = mkdtempSync(path.join(tmpdir(), "company-selection-tests-"));
const tscPath = path.join(projectRoot, "node_modules", ".bin", "tsc");

try {
  const compile = spawnSync(
    tscPath,
    [
      "--outDir", outputDirectory,
      "--module", "commonjs",
      "--target", "ES2022",
      "--moduleResolution", "node",
      "--esModuleInterop", "true",
      "--skipLibCheck", "true",
      "--strict", "true",
      path.join(projectRoot, "tests", "companySelectionPersistence.test.ts"),
    ],
    { cwd: projectRoot, encoding: "utf8" },
  );

  if (compile.status !== 0) {
    process.stderr.write(compile.stdout);
    process.stderr.write(compile.stderr);
    process.exitCode = compile.status ?? 1;
  } else {
    const testFile = path.join(
      outputDirectory,
      "tests",
      "companySelectionPersistence.test.js",
    );
    const run = spawnSync(process.execPath, ["--test", testFile], {
      cwd: projectRoot,
      encoding: "utf8",
    });
    process.stdout.write(run.stdout);
    process.stderr.write(run.stderr);
    process.exitCode = run.status ?? 1;
  }
} finally {
  rmSync(outputDirectory, { recursive: true, force: true });
}

const { execSync } = require("child_process");

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Error: Commit message is required.");
  process.exit(1);
}

const commitMessage = args.join(" ");
try {
  execSync("git add .", { stdio: "inherit" });
  execSync(`git commit -m "${commitMessage}"`, { stdio: "inherit" });
  execSync("git push origin main", { stdio: "inherit" });
} catch (error) {
  console.error("Error executing Git commands:", error.message);
  process.exit(1);
}

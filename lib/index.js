const { spawnSync } = require("child_process");
const XLSX = require("xlsx");

const runCommand = (command) => {
    const result = spawnSync(command, { shell: true, encoding: "utf-8" });

    if (result.error) {
        console.error(`❌ Error running command: ${command}\n${result.error.message}`);
        return null;
    }
    return result.stdout.trim();
};

const checkOutdatedPackages = () => {
    console.log("🔍 Checking outdated packages...");
    const output = runCommand("npm outdated --json");
    return output ? JSON.parse(output) : {};
};

const runNpmAudit = () => {
    console.log("🔍 Running npm audit...");
    const output = runCommand("npm audit --json");
    try {
        return output ? JSON.parse(output) : {};
    } catch (error) {
        console.error("❌ JSON Parsing Error:", error.message);
        return {};
    }
};

const checkUnusedDependencies = () => {
    console.log("🔍 Checking for unused dependencies...");
    const output = runCommand("npx depcheck --json");
    try {
        return output ? JSON.parse(output) : {};
    } catch (error) {
        console.error("❌ JSON Parsing Error in depcheck:", error.message);
        return {};
    }
};

const generateExcelReport = (outdatedPackages, npmAuditResults, unusedDependencies) => {
    console.log("📊 Generating Excel report...");

    const outdatedRows = Object.entries(outdatedPackages).map(([pkg, details]) => ({
        "Package Name": pkg,
        "Current Version": details.current || "Unknown",
        "Wanted Version": details.wanted || "Unknown",
        "Latest Version": details.latest || "Unknown",
        "Dependency Type": details.type || "Unknown",
        "Needs Update": details.current !== details.latest ? "YES" : "NO",
    }));

    const securityRows = [];
    if (npmAuditResults.vulnerabilities) {
        Object.entries(npmAuditResults.vulnerabilities).forEach(([pkg, details]) => {
            details.via.forEach((vuln) => {
                if (typeof vuln === "object") {
                    securityRows.push({
                        "Package Name": pkg,
                        "Severity": vuln.severity || "Unknown",
                        "Vulnerability": vuln.title || "No description",
                        "Fix Available": details.fixAvailable ? "Yes" : "No",
                        "Recommended Fix": details.fixAvailable ? "npm audit fix --force" : "Manual review",
                        "Advisory URL": vuln.url || "N/A",
                    });
                }
            });
        });
    }

    const unusedRows = (unusedDependencies.dependencies || []).map((dep) => ({
        "Unused Dependency": dep,
        "Reason": "Not imported in any file",
    }));

    const workbook = XLSX.utils.book_new();
    const outdatedSheet = XLSX.utils.json_to_sheet(outdatedRows);
    const securitySheet = XLSX.utils.json_to_sheet(securityRows);
    const unusedSheet = XLSX.utils.json_to_sheet(unusedRows);

    XLSX.utils.book_append_sheet(workbook, outdatedSheet, "Outdated Packages");
    XLSX.utils.book_append_sheet(workbook, securitySheet, "Security Issues");
    XLSX.utils.book_append_sheet(workbook, unusedSheet, "Unused Dependencies");

    XLSX.writeFile(workbook, "npm_security_report.xlsx");
    console.log("✅ Report generated: npm_security_report.xlsx");
};

const runChecks = async () => {
    console.log("\n🚀 Running Full Security Check...\n");

    const outdatedPackages = checkOutdatedPackages();
    const npmAuditResults = runNpmAudit();
    const unusedDependencies = checkUnusedDependencies();

    generateExcelReport(outdatedPackages, npmAuditResults, unusedDependencies);
};

module.exports = { runChecks };

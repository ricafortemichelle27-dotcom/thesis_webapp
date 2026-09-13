import { useState } from "react";
import {
	departmentOptions,
	getMajors,
	getPrograms,
} from "../../../utils/academicStructure.js";
import "./DownloadAttendance.css";

const yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

function DownloadAttendance({ report, onClose }) {
	const [department, setDepartment] = useState("ALL");
	const [program, setProgram] = useState("ALL");
	const [major, setMajor] = useState("ALL");
	const [yearLevel, setYearLevel] = useState("ALL");

	if (!report) {
		return null;
	}

	const availablePrograms = getPrograms(department === "ALL" ? "" : department);
	const availableMajors = getMajors(
		department === "ALL" ? "" : department,
		program === "ALL" ? "" : program
	);
	const previewRows = report.departmentBreakdown.filter((row) =>
		(department === "ALL" || row.department === department) &&
		(program === "ALL" || row.program === program) &&
		(major === "ALL" || row.major === major) &&
		(yearLevel === "ALL" || row.yearLevel === yearLevel)
	);

	const handleDepartmentChange = (event) => {
		setDepartment(event.target.value);
		setProgram("ALL");
		setMajor("ALL");
		setYearLevel("ALL");
	};

	const handleProgramChange = (event) => {
		setProgram(event.target.value);
		setMajor("ALL");
		setYearLevel("ALL");
	};

	const handleMajorChange = (event) => {
		setMajor(event.target.value);
		setYearLevel("ALL");
	};

	const downloadReport = () => {
		if (previewRows.length === 0) return;

		const reportContent = [
			"Event,Department,Program,Major,Year Level,Attendees,Present,Absent,Attendance Rate",
			...previewRows.map((row) => [
				report.eventName,
				row.department,
				row.program,
				row.major || "",
				row.yearLevel || "All Year Levels",
				row.attendees,
				row.present,
				row.absent,
				`${Math.round((row.present / row.attendees) * 100)}%`,
			].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")),
		].join("\n");

		const blob = new Blob([reportContent], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		const departmentLabel = department === "ALL" ? "All_Departments" : department;
		link.href = url;
		link.download = `${report.eventName.replaceAll(" ", "_")}_${departmentLabel}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	return (
		<div className="download-attendance-overlay" role="dialog" aria-modal="true">
			<div className="download-attendance-modal">
				<div className="download-attendance-header">
					<div>
						<span className="download-attendance-eyebrow">ATTENDANCE PREVIEW</span>
						<h2>{report.eventName}</h2>
						<p>{report.date} at {report.time}</p>
					</div>

					<button
						type="button"
						className="download-attendance-close"
						onClick={onClose}
						aria-label="Close attendance preview"
					>
						×
					</button>
				</div>

				<div className="download-attendance-controls">
					<label>
						Department
						<select value={department} onChange={handleDepartmentChange}>
							<option value="ALL">All Departments</option>
							{departmentOptions.map((item) => (
								<option key={item} value={item}>{item}</option>
							))}
						</select>
					</label>

					<label>
						Program
						<select
							value={program}
							onChange={handleProgramChange}
							disabled={department === "ALL"}
						>
							<option value="ALL">All Programs</option>
							{availablePrograms.map((item) => (
								<option key={item.name} value={item.name}>{item.name}</option>
							))}
						</select>
					</label>

					<label>
						Major
						<select
							value={major}
							onChange={handleMajorChange}
							disabled={department === "ALL" || program === "ALL" || availableMajors.length === 0}
						>
							<option value="ALL">
								{availableMajors.length === 0 ? "Not applicable" : "All Majors"}
							</option>
							{availableMajors.map((item) => (
								<option key={item} value={item}>{item}</option>
							))}
						</select>
					</label>

					<label>
						Year Level
						<select
							value={yearLevel}
							onChange={(event) => setYearLevel(event.target.value)}
							disabled={
								department === "ALL" ||
								program === "ALL" ||
								(availableMajors.length > 0 && major === "ALL")
							}
						>
							<option value="ALL">All Year Levels</option>
							{yearLevels.map((item) => (
								<option key={item} value={item}>{item}</option>
							))}
						</select>
					</label>

					<button
						type="button"
						className="download-attendance-button"
						onClick={downloadReport}
						disabled={previewRows.length === 0}
					>
						Download ↓
					</button>
				</div>

				<div className="download-attendance-label">
					<strong>{department === "ALL" ? "All Departments" : department}</strong>
					<span>{previewRows.length} attendance groups</span>
				</div>

				<div className="download-attendance-table-container">
					<table className="download-attendance-table">
						<thead>
							<tr>
								<th>DEPARTMENT</th>
								<th>PROGRAM</th>
								<th>MAJOR</th>
								<th>YEAR LEVEL</th>
								<th>ATTENDEES</th>
								<th>PRESENT</th>
								<th>ABSENT</th>
								<th>RATE</th>
							</tr>
						</thead>
						<tbody>
							{previewRows.map((row) => (
								<tr key={`${row.department}-${row.program}-${row.major}-${row.yearLevel}`}>
									<td>{row.department}</td>
									<td>{row.program}</td>
									<td>{row.major || "No major"}</td>
									<td>{row.yearLevel || "All Year Levels"}</td>
									<td>{row.attendees}</td>
									<td>{row.present}</td>
									<td>{row.absent}</td>
									<td>{Math.round((row.present / row.attendees) * 100)}%</td>
								</tr>
							))}
							{previewRows.length === 0 && (
								<tr>
									<td colSpan="8" className="download-attendance-empty">
										No attendance groups match the selected filters.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}

export default DownloadAttendance;

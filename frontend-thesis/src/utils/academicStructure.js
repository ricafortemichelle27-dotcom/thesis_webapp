export const academicStructure = [
    {
        department: "COE",
        programs: [
            { name: "General Engineering", firstYearOnly: true },
            { name: "BS Civil Engineering" },
            { name: "BS Computer Engineering" },
            { name: "BS Electrical Engineering" },
            { name: "BS Electronics Engineering" },
            { name: "BS Industrial Engineering" },
            { name: "BS Mechanical Engineering" },
        ],
    },
    {
        department: "CAS",
        programs: [
            { name: "BA Communication" },
            { name: "BS Psychology" },
            { name: "BA English Language Studies" },
            { name: "BS Public Administration" },
            { name: "BA Political Science" },
            { name: "BS Mathematics" },
            { name: "BS Sociology" },
        ],
    },
    {
        department: "SOC",
        programs: [{ name: "BS Criminology", majors: [] }],
    },
    {
        department: "CTHM",
        programs: [
            { name: "BS Tourism Management" },
            { name: "BS Hospitality Management" },
        ],
    },
    {
        department: "CTE",
        programs: [
            { name: "BSEd Mathematics" },
            { name: "BSEd English" },
            { name: "BSEd Science" },
            { name: "Bachelor of Early Childhood Education" },
        ],
    },
    {
        department: "SEBA",
        programs: [
            { name: "BS Entrepreneurship" },
            { name: "AB Economics" },
            { name: "BS Real Estate Management" },
            { name: "BS Accountancy" },
            { name: "BS Business Administration-Business Economics" },
            { name: "BS Business Administration-Human Resource Management" },
            { name: "BS Business Administration-Marketing" },
            { name: "BS Customs Administration" },
        ],
    },
    {
        department: "CITCS",
        programs: [
            { name: "BS Information Technology", majors: [] },
            { name: "BS Computer Science", majors: [] },
        ],
    },
];

export const departmentOptions = academicStructure.map(
    ({ department }) => department
);

export const getDepartment = (department) =>
    academicStructure.find((item) => item.department === department);

export const getProgram = (department, program) =>
    getDepartment(department)?.programs.find((item) => item.name === program);

export const getPrograms = (department) =>
    getDepartment(department)?.programs || [];

export const getMajors = (department, program) =>
    getProgram(department, program)?.majors || [];

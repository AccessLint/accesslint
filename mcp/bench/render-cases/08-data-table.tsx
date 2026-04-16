import React from "react";

const columns = ["Name", "Email", "Role"];
const rows = [
  { name: "Alice", email: "alice@example.com", role: "Admin" },
  { name: "Bob", email: "bob@example.com", role: "User" },
];

export default function DataTable() {
  return (
    <table>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col} scope="diagonal">{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.name}>
            <td>{row.name}</td>
            <td>{row.email}</td>
            <td>{row.role}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

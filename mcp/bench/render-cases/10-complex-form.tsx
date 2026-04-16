import React from "react";

const formId = "signup";
const fields = [
  { name: "fullName", type: "text", label: "Full Name" },
  { name: "email", type: "email", label: "Email Address" },
];

export default function ComplexForm() {
  return (
    <form id={formId}>
      <h2>Sign Up</h2>
      {fields.map((field) => (
        <div key={field.name}>
          <label htmlFor={`${formId}-${field.name}`}>{field.label}</label>
          <input
            type={field.type}
            id={`${formId}-${field.name}`}
            name={field.name}
            tabIndex={0}
          />
        </div>
      ))}
      <div>
        <label htmlFor={`${formId}-tos`}>
          <input type="checkbox" id={`${formId}-tos`} name="tos" />
          I agree to the <a href="/terms">terms of service</a>
        </label>
      </div>
      <button type="submit">Create Account</button>
    </form>
  );
}

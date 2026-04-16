import React from "react";

export default function ButtonVariants() {
  return (
    <div>
      <button
        className="btn btn-primary"
        style={{ backgroundColor: "blue", color: "white" }}
        type="button"
      >
        Save
      </button>
      <button
        className="btn btn-danger"
        style={{ backgroundColor: "red", color: "white" }}
        disabled={true}
      >
        Delete
      </button>
      <button
        className="btn btn-icon"
        aria-label="Close dialog"
        style={{ padding: "4px" }}
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
}

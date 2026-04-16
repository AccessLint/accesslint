import React from "react";

function Badge({ text }: { text: string }) {
  return <span className="badge">{text}</span>;
}

function StatusIcon() {
  return <img src="/icons/status.svg" />;
}

export default function FragmentSpread() {
  return (
    <>
      <div>
        <h3>User Profile</h3>
        <Badge text="Admin" />
        <StatusIcon />
      </div>
      <>
        <p>Additional info section</p>
        <Badge text="Active" />
      </>
    </>
  );
}

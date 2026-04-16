import React from "react";

export default function AriaHiddenInputs() {
  return (
    <div>
      <h2>Settings</h2>
      <div aria-hidden="true">
        <p>Hidden controls:</p>
        <button onClick={() => {}}>Toggle Feature</button>
        <input type="text" name="search" placeholder="Search..." />
        <a href="/help">Help</a>
      </div>
      <p>Visible content below.</p>
    </div>
  );
}

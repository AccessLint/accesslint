import React from "react";

const isLoggedIn = false;
const hasNotifications = true;
const userName = "Alice";

export default function ConditionalRender() {
  return (
    <div>
      <h1>Dashboard</h1>
      {isLoggedIn ? (
        <p>Welcome back, {userName}!</p>
      ) : (
        <div>
          <p>Please sign in to continue.</p>
          <button></button>
        </div>
      )}
      {hasNotifications && (
        <div role="alert">
          <img src="/icons/bell.png" />
          <span>You have new notifications</span>
        </div>
      )}
    </div>
  );
}

import React from "react";

export default function FormNoLabels() {
  return (
    <form>
      <input type="text" name="username" placeholder="Username" />
      <input type="email" name="email" placeholder="Email" />
      <select name="role">
        <option value="">Choose role</option>
        <option value="admin">Admin</option>
        <option value="user">User</option>
      </select>
      <button type="submit">Submit</button>
    </form>
  );
}

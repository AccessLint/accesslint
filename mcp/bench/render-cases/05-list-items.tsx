import React from "react";

const menuItems = [
  { href: "/home", label: "Home" },
  { href: "/about", label: "" },
  { href: "/contact", label: "" },
];

export default function ListItems() {
  return (
    <nav>
      <ul>
        {menuItems.map((item) => (
          <li key={item.href}>
            <a href={item.href}>{item.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

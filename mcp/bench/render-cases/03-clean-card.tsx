import React from "react";

export default function CleanCard() {
  return (
    <article>
      <h2>Accessible Card</h2>
      <img src="/photo.jpg" alt="A scenic mountain landscape" />
      <p>This card component is fully accessible with proper alt text and heading structure.</p>
      <a href="/details">Read more about this landscape</a>
    </article>
  );
}

import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { tdHasHeader } from "./td-has-header";


describe("adaptable/td-has-header", () => {
  it("passes small table without explicit headers", () => {
    const doc = makeDoc(`
      <table>
        <tr><th>A</th><th>B</th></tr>
        <tr><td>1</td><td>2</td></tr>
      </table>
    `);
    // 2x2 table - small, passes
    expect(tdHasHeader.run(doc)).toHaveLength(0);
  });

  it("passes large table with scoped headers", () => {
    const doc = makeDoc(`
      <table>
        <tr><th scope="col">A</th><th scope="col">B</th><th scope="col">C</th><th scope="col">D</th></tr>
        <tr><td>1</td><td>2</td><td>3</td><td>4</td></tr>
        <tr><td>5</td><td>6</td><td>7</td><td>8</td></tr>
        <tr><td>9</td><td>10</td><td>11</td><td>12</td></tr>
        <tr><td>13</td><td>14</td><td>15</td><td>16</td></tr>
      </table>
    `);
    expect(tdHasHeader.run(doc)).toHaveLength(0);
  });

  it("skips presentational tables", () => {
    const doc = makeDoc(`
      <table role="presentation">
        <tr><td>A</td><td>B</td><td>C</td><td>D</td></tr>
        <tr><td>1</td><td>2</td><td>3</td><td>4</td></tr>
      </table>
    `);
    expect(tdHasHeader.run(doc)).toHaveLength(0);
  });
});

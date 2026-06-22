// ── Static Math Formula Sheet ───────────────────────────────────────────────
import { helpButton, wireHelp } from "../help.js";

export async function renderFormulas(view){
  view.innerHTML = `
    <div class="spread"><h1>📐 Math Formula Sheet</h1>${helpButton("formulas")}</div>

    <div class="card"><h2 style="margin-top:0">Circles</h2>
      <ul>
        <li>Area = πr²</li>
        <li>Circumference = 2πr = πd</li>
        <li>Arc length = (θ/360) · 2πr</li>
        <li>Sector area = (θ/360) · πr²</li>
        <li>Equation: (x − h)² + (y − k)² = r² &nbsp;(center (h, k))</li>
      </ul></div>

    <div class="card"><h2 style="margin-top:0">Triangles</h2>
      <ul>
        <li>Area = ½ · base · height</li>
        <li>Pythagorean: a² + b² = c²</li>
        <li>Special right: 30-60-90 → x : x√3 : 2x</li>
        <li>Special right: 45-45-90 → x : x : x√2</li>
        <li>Sum of interior angles = 180°</li>
      </ul></div>

    <div class="card"><h2 style="margin-top:0">Lines &amp; Slope</h2>
      <ul>
        <li>Slope m = (y₂ − y₁) / (x₂ − x₁)</li>
        <li>Slope-intercept: y = mx + b</li>
        <li>Point-slope: y − y₁ = m(x − x₁)</li>
        <li>Parallel → equal slopes; Perpendicular → slopes multiply to −1</li>
        <li>Distance = √[(x₂−x₁)² + (y₂−y₁)²]</li>
      </ul></div>

    <div class="card"><h2 style="margin-top:0">Exponents</h2>
      <ul>
        <li>xᵃ · xᵇ = xᵃ⁺ᵇ &nbsp;·&nbsp; xᵃ / xᵇ = xᵃ⁻ᵇ</li>
        <li>(xᵃ)ᵇ = xᵃᵇ</li>
        <li>x⁻ᵃ = 1 / xᵃ &nbsp;·&nbsp; x⁰ = 1</li>
        <li>x^(a/b) = ᵇ√(xᵃ)</li>
      </ul></div>

    <div class="card"><h2 style="margin-top:0">Quadratics</h2>
      <ul>
        <li>Standard: ax² + bx + c = 0</li>
        <li>Quadratic formula: x = (−b ± √(b² − 4ac)) / 2a</li>
        <li>Discriminant b² − 4ac: &gt;0 two roots, =0 one, &lt;0 none</li>
        <li>Vertex form: y = a(x − h)² + k &nbsp;(vertex (h, k))</li>
        <li>Vertex x = −b / 2a &nbsp;·&nbsp; sum of roots = −b/a, product = c/a</li>
      </ul></div>`;
  wireHelp(view, "formulas");
}

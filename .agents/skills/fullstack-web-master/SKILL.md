---
name: fullstack-web-master
description: Complete end-to-end web development skill covering architecture, design systems, modern frontend UI/UX polish, and resilient backend integrations.
version: 1.0.0
---

## Objective
Act as a Principal Full-Stack Engineer and Lead UI/UX Designer. Avoid generic "AI-generated" aesthetics, maintain strict code quality, and prioritize modular architecture.

---

## 1. Design & UI Polish Standard (Design Engineering)
- **Design Tokens & Hierarchy**:
  - Stick to an 8pt layout grid (spacing tokens: 4px, 8px, 16px, 24px, 32px).
  - Never use pure black (`#000000`) for text or backgrounds; prefer zinc/slate neutrals (`#09090b`, `#18181b`, `#27272a`).
  - Maintain a maximum of 3 font weights (regular, medium, bold) with clear typographic scale.
- **Elevation & Borders**:
  - Replace heavy `box-shadow` with subtle, layered borders (e.g., `1px border border-white/10` or `border-neutral-200`).
- **Interaction & State**:
  - Every interactive element must define all 5 states: default, hover, active/pressed, focus-visible, and disabled.
  - Transitions must use realistic easing (`transition-all duration-200 ease-out`).
- **Data States**:
  - Never display blank screens while waiting for network requests; always render skeleton screens or accessible spinners.
  - Implement actionable empty states with clear CTAs.

---

## 2. Frontend Engineering (React / Next.js / Vue / HTML)
- **Component Modularization**: Break monolithic components into single-responsibility primitives (Card, Badge, Button, Modal).
- **Accessibility (a11y)**:
  - Add appropriate `aria-expanded`, `aria-label`, and `role` attributes.
  - Preserve natural keyboard navigation (`tabindex`, focus traps for dialogs).
- **Responsive Patterns**:
  - Default to mobile-first development.
  - Verify layout integrity across mobile (<640px), tablet (768px), and desktop (1024px+).

---

## 3. Backend & API Conventions
- **Clean Contracts**:
  - Validate all inbound and outbound payloads at the boundaries using schema validation (Zod, Pydantic, or native validation).
  - Follow RESTful conventions or standard RPC patterns with consistent JSON error structures:
    `{ "error": { "code": "VALIDATION_FAILED", "message": "...", "details": [] } }`
- **Security & Hygiene**:
  - Keep secrets strictly in environment variables; never hardcode credentials.
  - Implement rate limiting, parameterized database queries, and CORS boundaries.

---

## 4. Execution Workflow
1. **Scope & Plan**: Before writing code, state the proposed architecture and visual theme in 2–3 sentences.
2. **Implement**: Deliver complete, idiomatic code without placeholders or omitted boilerplate.
3. **Self-Review**: Verify layout responsiveness, contrast ratios, and edge-case handling before finalizing.
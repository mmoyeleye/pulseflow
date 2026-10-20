# Design Brief
## Hospital Patient Flow Management System
### Minimalistic Design Approach

---

## Design Philosophy

**Principle:** Simplicity serves speed. In a busy hospital, complex UI creates errors.

- **No unnecessary colors:** Use one brand color (blue), white backgrounds, light gray for sections
- **Large touch targets:** 44px minimum for buttons (mobile patients may tap in stress)
- **Clear hierarchy:** Heading → subheading → content. No more than 3 levels
- **One action per screen:** No cognitive overload
- **White space:** Breathe room between elements

---

## Color Palette

| Element | Color | Use |
|---------|-------|-----|
| Primary | #0066cc | Buttons, active states, links |
| Success | #28a745 | Confirmations, "Call Next", completed |
| Error | #dc3545 | Errors, failures, blocks |
| Background | #ffffff | Main canvas |
| Subtle | #f0f0f0 | Cards, sections |
| Text Primary | #333333 | Body text, headings |
| Text Secondary | #666666 | Labels, helpers |

---

## Typography

- **Headings:** Arial or system font, 24px (h1), 18px (h2), bold
- **Body:** 14px, regular weight, 1.5 line height
- **Labels:** 12px, uppercase, gray

---

## Component Library

### Button
- **Size:** 44px height minimum (mobile-friendly)
- **State:** Default (blue), Hover (darker blue), Disabled (gray)
- **Text:** One line, center-aligned

### Form Input
- **Border:** 1px gray, subtle shadow on focus
- **Padding:** 12px
- **Placeholder:** Light gray, disappears on type

### Card
- **Background:** Light gray (#f9f9f9)
- **Border:** 1px left border (primary color) for visual anchor
- **Padding:** 15px
- **No drop shadow** (too visual clutter)

### Queue Item
- Shows: Position # | Patient name | Current stage | Wait time
- Visual: position in large blue number, rest in simple layout

### Status Badges
- **CHECKED_IN:** Gray
- **CALLED:** Orange
- **IN_CONSULTATION:** Blue
- **COMPLETED:** Green

---

## Layout Grid

- **Desktop:** 1200px max width, 20px gutters
- **Mobile:** Full width, 15px padding

---

## Accessibility

- 4.5:1 contrast ratio on all text
- Keyboard navigation (tab through all buttons)
- Screen-reader friendly (alt text on icons)
- No color-only status indication (always add text label)

---

## Screens

### 1. Check-in Form
[HOSPITAL LOGO]
Check-in Patient

Name: []
Phone: []
Insurance: [DROPDOWN: CASH, NHIA, HMO, EMERGENCY]

[Check In Button]


### 2. Success Screen

✓ Check-in Successful!

Patient ID: pat-1234567890
Queue Position: #5
Estimated Wait: 20 minutes

[Save Patient ID Button]


### 3. Queue Dashboard (Staff)

Queue - GOPD Department

Patients Waiting: 8

[Call Next Patient Button] [Refresh Button]

Chioma Okafor - REGISTRATION - 0 min
Adeyemi A. - VERIFICATION - 10 min
Fatima Hassan - PAYMENT - 20 min
...

### 4. Patient Status

Enter Your Patient ID: [________]

[Check Status Button]

Your Status
Name: Chioma Okafor
Position: 3 in queue
Current Stage: REGISTRATION
Est. Wait: 20 minutes

Last Updated: 2 min ago


---

## Motion & Interaction

- No animations (focus on speed, not flash)
- Buttons respond immediately (visual feedback)
- Loading state: "Checking..." text + spinner
- Errors: Red text, 2-second display

---

## Tone

- **Voice:** Professional but warm. Not formal, not casual.
- **Copy examples:**
  - "You are next!" (instead of "Position 1")
  - "Estimated wait: 15–20 minutes" (instead of "ETA: 15m")
  - "Network reconnected" (instead of "Sync successful")
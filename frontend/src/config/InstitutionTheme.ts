import {
  Stethoscope,
  GraduationCap,
  Hotel,
  Building2,
  ShoppingCart,
  LucideIcon,
} from "lucide-react";

export type InstitutionType = "hospital" | "school" | "hotel" | "business" | "ecommerce";


export type ModuleKey =
  | "dashboard"
  | "shop"
  | "crm"
  | "bookings"
  | "documents"
  | "workflows"
  | "employees"
  | "inventory"
  | "accounting"
  | "ai-reports"
  | "billing"
  | "audit";

export interface TriggerOption {
  value: string;
  label: string;
  category?: string;
}

export interface InstitutionConfig {
  id: InstitutionType;
  name: string;
  tagline: string;
  icon: LucideIcon;
  badgeBg: string;
  badgeText: string;
  primaryColor: string;
  
  // Enabled Feature Modules for this institution
  enabledModules: ModuleKey[];
  
  // Domain-specific Workflow Triggers for this business type
  workflowTriggers: TriggerOption[];
  
  // Custom Navigation Labels per business type
  navLabels: {
    crm: string;
    bookings?: string;
    documents?: string;
    employees: string;
    inventory: string;
    accounting: string;
    workflows?: string;
    reports: string;
    shop?: string;
  };
  
  // Vocabulary / Labels
  crmModuleTitle: string;
  clientLabel: string;
  clientLabelPlural: string;
  staffLabel: string;
  staffLabelPlural: string;
  bookingLabel: string;
  bookingLabelPlural: string;
  inventoryLabel: string;
  resourceUnitLabel: string; // Bed / Room / Classroom / Meeting Room
  
  // Pipeline Stages
  pipelineStages: { id: string; label: string; color: string }[];
  
  // Quick Metric Cards
  metric1: string;
  metric2: string;
  metric3: string;
  metric4: string;
}

export const fontThemes: Record<InstitutionType, InstitutionConfig> = {
  hospital: {
    id: "hospital",
    name: "Hospital / Healthcare",
    tagline: "Patients, Triage, Clinical Checkups & Medical Supplies",
    icon: Stethoscope,
    badgeBg: "bg-emerald-100 dark:bg-emerald-950/60",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    primaryColor: "emerald",
    
    enabledModules: ["dashboard", "documents", "crm", "bookings", "employees", "inventory", "accounting", "ai-reports", "workflows", "audit", "billing"],
    
    workflowTriggers: [
      { value: "patient_triage_registered", label: "🏥 Patient Intake / Triage Registered", category: "Patients" },
      { value: "doctor_assigned", label: "👨‍⚕️ Doctor Assigned to Patient", category: "Patients" },
      { value: "appointment_scheduled", label: "📅 Clinical Appointment Scheduled", category: "Appointments" },
      { value: "appointment_reminder_24h", label: "⏰ 24h Pre-Appointment Reminder", category: "Appointments" },
      { value: "patient_discharged", label: "✅ Patient Treated & Discharged", category: "Patients" },
      { value: "medicine_stock_critical", label: "💊 Medical Supply / Pharmacy Low Stock", category: "Inventory" },
      { value: "user_registered", label: "👤 New Medical Staff Account Created", category: "System" },
    ],
    
    navLabels: {
      crm: "Patient Records",
      bookings: "Clinical Appointments",
      employees: "Doctors & Medical Staff",
      inventory: "Pharmacy & Medical Supplies",
      accounting: "Medical Billing & Fees",
      workflows: "Clinical Automations",
      reports: "Clinical BI Reports",
    },
    
    crmModuleTitle: "Patient Directory",
    clientLabel: "Patient",
    clientLabelPlural: "Patients",
    staffLabel: "Doctor / Nurse",
    staffLabelPlural: "Doctors & Nurses",
    bookingLabel: "Appointment / Checkup",
    bookingLabelPlural: "Appointments",
    inventoryLabel: "Medical Supplies & Pharmaceuticals",
    resourceUnitLabel: "Bed / Ward / Clinic Room",
    
    pipelineStages: [
      { id: "new", label: "Triage / Intake", color: "border-emerald-500 text-emerald-600" },
      { id: "contacted", label: "Doctor Assigned", color: "border-blue-500 text-blue-600" },
      { id: "proposal", label: "Under Diagnosis", color: "border-purple-500 text-purple-600" },
      { id: "won", label: "Treated & Discharged", color: "border-green-500 text-green-600" },
      { id: "lost", label: "Transferred / Cancelled", color: "border-slate-500 text-slate-600" },
    ],
    
    metric1: "Active Patients",
    metric2: "Today's Appointments",
    metric3: "Duty Staff",
    metric4: "Medical Billing",
  },

  school: {
    id: "school",
    name: "School / Academy",
    tagline: "Students, Parents, Classes & Academic Events",
    icon: GraduationCap,
    badgeBg: "bg-blue-100 dark:bg-blue-950/60",
    badgeText: "text-blue-700 dark:text-blue-300",
    primaryColor: "blue",
    
    enabledModules: ["dashboard", "documents", "crm", "bookings", "employees", "inventory", "accounting", "ai-reports", "workflows", "audit", "billing"],
    
    workflowTriggers: [
      { value: "student_application_submitted", label: "📝 Admission Inquiry / Application Submitted", category: "Admissions" },
      { value: "interview_scheduled", label: "🗣️ Parent-Teacher Interview Scheduled", category: "Meetings" },
      { value: "student_enrolled", label: "🎓 Student Officially Enrolled", category: "Students" },
      { value: "tuition_fee_due", label: "💳 Tuition Fee Payment Reminder", category: "Billing" },
      { value: "attendance_flagged", label: "⚠️ Student Absence Alert to Parent", category: "Attendance" },
      { value: "textbook_overdue", label: "📚 Library / Textbook Return Overdue", category: "Inventory" },
      { value: "user_registered", label: "👤 New Faculty / Staff Account Created", category: "System" },
    ],
    
    navLabels: {
      crm: "Student & Parent Records",
      bookings: "Meetings & Class Schedule",
      employees: "Teachers & Faculty",
      inventory: "Lab & School Supplies",
      accounting: "Tuition & Fee Billing",
      workflows: "Academic Automations",
      reports: "Academic Performance BI",
    },
    
    crmModuleTitle: "Student & Parent Directory",
    clientLabel: "Student / Parent",
    clientLabelPlural: "Students & Parents",
    staffLabel: "Teacher / Faculty",
    staffLabelPlural: "Teachers & Staff",
    bookingLabel: "Parent Meeting / Class",
    bookingLabelPlural: "Meetings & Classes",
    inventoryLabel: "Lab Equipment & Textbooks",
    resourceUnitLabel: "Classroom / Auditorium / Lab",
    
    pipelineStages: [
      { id: "new", label: "Inquiry / Application", color: "border-blue-500 text-blue-600" },
      { id: "contacted", label: "Interview Scheduled", color: "border-indigo-500 text-indigo-600" },
      { id: "proposal", label: "Admission Offered", color: "border-purple-500 text-purple-600" },
      { id: "won", label: "Enrolled", color: "border-green-500 text-green-600" },
      { id: "lost", label: "Withdrawn", color: "border-slate-500 text-slate-600" },
    ],
    
    metric1: "Enrolled Students",
    metric2: "Upcoming Meetings",
    metric3: "Faculty Count",
    metric4: "School Fees Revenue",
  },

  hotel: {
    id: "hotel",
    name: "Hotel / Hospitality",
    tagline: "Guest Reservations, Room Booking & Amenities",
    icon: Hotel,
    badgeBg: "bg-amber-100 dark:bg-amber-950/60",
    badgeText: "text-amber-700 dark:text-amber-300",
    primaryColor: "amber",
    
    enabledModules: ["dashboard", "documents", "bookings", "crm", "employees", "inventory", "accounting", "ai-reports", "workflows", "audit", "billing"],
    
    workflowTriggers: [
      { value: "reservation_created", label: "🏨 New Room Reservation Booked", category: "Reservations" },
      { value: "deposit_received", label: "💰 Room Deposit Payment Received", category: "Billing" },
      { value: "guest_checked_in", label: "🗝️ Guest Checked-In (Send Welcome & Wi-Fi)", category: "Check-In" },
      { value: "guest_checked_out", label: "🚗 Guest Checked-Out (Send Feedback Survey)", category: "Check-Out" },
      { value: "room_service_requested", label: "🛎️ Room Service / Amenity Request", category: "Services" },
      { value: "room_cleaning_alert", label: "🧹 Housekeeping Room Cleaning Required", category: "Operations" },
      { value: "user_registered", label: "👤 New Hotel Staff Account Created", category: "System" },
    ],
    
    navLabels: {
      crm: "Guest Directory",
      bookings: "Room Reservations",
      employees: "Hotel Staff & Hosts",
      inventory: "Room Amenities & Linens",
      accounting: "Guest Folios & Invoices",
      workflows: "Guest Automations",
      reports: "Occupancy & Revenue BI",
    },
    
    crmModuleTitle: "Guest Directory",
    clientLabel: "Guest",
    clientLabelPlural: "Guests",
    staffLabel: "Host / Receptionist",
    staffLabelPlural: "Hotel Staff",
    bookingLabel: "Room Reservation",
    bookingLabelPlural: "Reservations",
    inventoryLabel: "Room Amenities & Linens",
    resourceUnitLabel: "Suite / Room Number",
    
    pipelineStages: [
      { id: "new", label: "Booking Inquiry", color: "border-amber-500 text-amber-600" },
      { id: "contacted", label: "Deposit Received", color: "border-orange-500 text-orange-600" },
      { id: "proposal", label: "Checked-In", color: "border-purple-500 text-purple-600" },
      { id: "won", label: "Checked-Out (Completed)", color: "border-green-500 text-green-600" },
      { id: "lost", label: "Cancelled", color: "border-slate-500 text-slate-600" },
    ],
    
    metric1: "Active Guests",
    metric2: "Room Reservations",
    metric3: "Hotel Staff",
    metric4: "Room Revenue",
  },

  business: {
    id: "business",
    name: "Enterprise Business",
    tagline: "Leads, Sales Pipeline, Inventory & Financials",
    icon: Building2,
    badgeBg: "bg-violet-100 dark:bg-violet-950/60",
    badgeText: "text-violet-700 dark:text-violet-300",
    primaryColor: "violet",
    
    enabledModules: ["dashboard", "documents", "crm", "bookings", "workflows", "employees", "inventory", "accounting", "ai-reports", "shop", "audit", "billing"],
    
    workflowTriggers: [
      { value: "lead_created", label: "📊 New Sales Lead Captured", category: "CRM" },
      { value: "lead_status_changed", label: "🔄 Lead Pipeline Stage Moved (e.g. Won/Lost)", category: "CRM" },
      { value: "proposal_sent", label: "📄 Sales Proposal Dispatched to Client", category: "Sales" },
      { value: "deal_won", label: "🏆 Deal Closed & Won", category: "Sales" },
      { value: "meeting_scheduled", label: "📅 Client Consultation Scheduled", category: "Bookings" },
      { value: "invoice_overdue", label: "⏳ Invoice Payment Overdue", category: "Accounting" },
      { value: "user_registered", label: "👤 New Employee Account Created", category: "System" },
    ],
    
    navLabels: {
      crm: "CRM Lead Pipeline",
      bookings: "Client Consultations",
      employees: "Team Directory",
      inventory: "Products & Stock",
      accounting: "Financial Accounting",
      workflows: "Workflow Automations",
      reports: "AI Business Reports",
      shop: "Store Integration",
    },
    
    crmModuleTitle: "CRM Lead Pipeline",
    clientLabel: "Lead / Client",
    clientLabelPlural: "Leads",
    staffLabel: "Employee",
    staffLabelPlural: "Employees",
    bookingLabel: "Client Meeting / Consult",
    bookingLabelPlural: "Bookings",
    inventoryLabel: "Products & Stock",
    resourceUnitLabel: "Meeting Room / Location",
    
    pipelineStages: [
      { id: "new", label: "New Lead", color: "border-slate-500 text-slate-600" },
      { id: "contacted", label: "Contacted", color: "border-blue-500 text-blue-600" },
      { id: "proposal", label: "Proposal Sent", color: "border-purple-500 text-purple-600" },
      { id: "won", label: "Deal Closed (Won)", color: "border-green-500 text-green-600" },
      { id: "lost", label: "Lost", color: "border-red-500 text-red-600" },
    ],
    
    metric1: "Total Leads",
    metric2: "Scheduled Consultations",
    metric3: "Active Employees",
    metric4: "Total Revenue",
  },

  ecommerce: {
    id: "ecommerce",
    name: "E-Commerce / Online Retail",
    tagline: "Product Catalog, Orders, Shopping Cart & Delivery",
    icon: ShoppingCart,
    badgeBg: "bg-emerald-100 dark:bg-emerald-950/60",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    primaryColor: "emerald",
    
    enabledModules: ["dashboard", "documents", "shop", "inventory", "crm", "accounting", "ai-reports", "employees", "audit", "billing"],
    
    workflowTriggers: [
      { value: "order_placed", label: "🛒 New Order Placed (Customer Checkout)", category: "Orders" },
      { value: "order_status_confirmed", label: "✅ Order Payment Confirmed", category: "Payment" },
      { value: "order_status_shipped", label: "🚚 Order Dispatched / Shipped", category: "Delivery" },
      { value: "order_status_delivered", label: "📦 Order Delivered to Customer", category: "Delivery" },
      { value: "cart_abandoned", label: "🛒 Shopping Cart Abandoned (Send Reminder)", category: "Marketing" },
      { value: "product_low_stock", label: "⚠️ Product Stock Low Alert (< 5 items)", category: "Inventory" },
      { value: "user_registered", label: "👤 New Shopping App User Registered", category: "System" },
    ],
    
    navLabels: {
      shop: "Shop Orders & Store",
      crm: "Customer Directory",
      employees: "Store Staff & Logistics",
      inventory: "Product Catalog & Stock",
      accounting: "Store Sales & Revenue",
      reports: "Sales BI Analytics",
    },
    
    crmModuleTitle: "Customer Directory",
    clientLabel: "Customer",
    clientLabelPlural: "Customers",
    staffLabel: "Store Staff",
    staffLabelPlural: "Store Staff",
    bookingLabel: "Delivery / Pickup Slot",
    bookingLabelPlural: "Deliveries",
    inventoryLabel: "Product Catalog & Stock",
    resourceUnitLabel: "SKU / Shelf Location",
    
    pipelineStages: [
      { id: "new", label: "New Order", color: "border-amber-500 text-amber-600" },
      { id: "confirmed", label: "Confirmed", color: "border-blue-500 text-blue-600" },
      { id: "processing", label: "Processing", color: "border-purple-500 text-purple-600" },
      { id: "shipped", label: "Shipped", color: "border-cyan-500 text-cyan-600" },
      { id: "delivered", label: "Delivered", color: "border-green-500 text-green-600" },
    ],
    
    metric1: "Total Orders",
    metric2: "Pending Deliveries",
    metric3: "Registered Customers",
    metric4: "Sales Revenue",
  },
};

export function getInstitutionTheme(type?: string): InstitutionConfig {
  if (type === "hospital") return fontThemes.hospital;
  if (type === "school") return fontThemes.school;
  if (type === "hotel") return fontThemes.hotel;
  if (type === "ecommerce") return fontThemes.ecommerce;
  return fontThemes.business;
}

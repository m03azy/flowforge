import { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  UserCheck,
  Building2,
  Hotel,
  GraduationCap,
  Stethoscope,
  Phone,
  MapPin,
  XCircle,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  User
} from "lucide-react";

type StaffUser = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  department?: string | null;
  job_title?: string | null;
};

type Booking = {
  id: number;
  institution_type: string;
  title: string;
  client_name: string;
  client_phone?: string | null;
  client_email?: string | null;
  assigned_staff_id?: number | null;
  assigned_staff?: StaffUser | null;
  resource_unit?: string | null;
  start_time: string;
  end_time?: string | null;
  status: string;
  notes?: string | null;
  created_at: string;
};

type Props = {
  token: string;
  userRole?: string;
  institutionType?: string;
};

export default function BookingManager({ token, userRole = "employee", institutionType }: Props) {
  // Mode is locked to the user's registered institution — never shows other types
  const institutionMode = (institutionType === "school" || institutionType === "hotel" || institutionType === "hospital" || institutionType === "general")
    ? institutionType
    : "hospital";
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form State
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [assignedStaffId, setAssignedStaffId] = useState<string>("");
  const [resourceUnit, setResourceUnit] = useState("");
  const [startTime, setStartTime] = useState("");
  const [notes, setNotes] = useState("");

  // Labels dynamically based on institutionMode
  const getLabels = () => {
    switch (institutionMode) {
      case "hospital":
        return {
          titleLabel: "Appointment Title",
          titlePlaceholder: "e.g. Cardiology Consultation",
          clientLabel: "Patient Name",
          clientPlaceholder: "e.g. John Doe",
          staffLabel: "Assigned Doctor / Practitioner",
          resourceLabel: "Room / Bed #",
          resourcePlaceholder: "e.g. ICU Bed 4 or Room 302",
          icon: Stethoscope,
          badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50"
        };
      case "hotel":
        return {
          titleLabel: "Reservation Name",
          titlePlaceholder: "e.g. Executive Suite Stay",
          clientLabel: "Guest Name",
          clientPlaceholder: "e.g. Sarah Jenkins",
          staffLabel: "Host / Receptionist",
          resourceLabel: "Suite / Room #",
          resourcePlaceholder: "e.g. Deluxe Room 408",
          icon: Hotel,
          badgeColor: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200 dark:border-sky-900/50"
        };
      case "school":
        return {
          titleLabel: "Meeting / Event Title",
          titlePlaceholder: "e.g. Parent-Teacher Conference",
          clientLabel: "Parent / Student Name",
          clientPlaceholder: "e.g. Michael Smith",
          staffLabel: "Teacher / Advisor",
          resourceLabel: "Classroom / Lab #",
          resourcePlaceholder: "e.g. Science Lab B",
          icon: GraduationCap,
          badgeColor: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 border-violet-200 dark:border-violet-900/50"
        };
      default:
        return {
          titleLabel: "Booking Title",
          titlePlaceholder: "e.g. Client Consultation",
          clientLabel: "Client Name",
          clientPlaceholder: "e.g. Alex Rivera",
          staffLabel: "Assigned Specialist",
          resourceLabel: "Facility Unit",
          resourcePlaceholder: "e.g. Main Hall",
          icon: Building2,
          badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700"
        };
    }
  };

  const labels = getLabels();

  // Fetch Bookings
  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/bookings/?institution_type=${institutionMode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Failed to load bookings");
      setBookings(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Employees list for assignment dropdown
  const fetchStaff = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/employees/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStaffMembers(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchStaff();
  }, [token, institutionMode]);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("http://localhost:8000/api/bookings/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          institution_type: institutionMode,
          title,
          client_name: clientName,
          client_phone: clientPhone || null,
          client_email: clientEmail || null,
          assigned_staff_id: assignedStaffId ? parseInt(assignedStaffId) : null,
          resource_unit: resourceUnit || null,
          start_time: new Date(startTime).toISOString(),
          status: "Scheduled",
          notes: notes || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Failed to create booking");

      setShowModal(false);
      resetForm();
      fetchBookings();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/bookings/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail ?? "Failed to update status");
      }
      fetchBookings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this booking?")) return;
    try {
      const res = await fetch(`http://localhost:8000/api/bookings/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete booking");
      fetchBookings();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const resetForm = () => {
    setTitle("");
    setClientName("");
    setClientPhone("");
    setClientEmail("");
    setAssignedStaffId("");
    setResourceUnit("");
    setStartTime("");
    setNotes("");
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.resource_unit && b.resource_unit.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || b.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const formatDateTime = (dtStr: string) => {
    try {
      const d = new Date(dtStr);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return dtStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <CalendarIcon className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            Bookings & Appointments
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage {{
              hospital: "patient appointments and clinical visits",
              hotel: "guest stay reservations and check-ins",
              school: "academic sessions and conference bookings",
              general: "enterprise meetings and resource bookings",
            }[institutionMode] ?? "appointments and bookings"} with automated WhatsApp notifications.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/20 active:scale-95 transition-all text-sm shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>New Appointment</span>
        </button>
      </div>

      {/* Institution Mode Badge — shows the locked institution type, no switcher */}
      {(() => {
        const modeConfig: Record<string, { label: string; icon: string; color: string }> = {
          hospital: { label: "Hospital", icon: "🏥", color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50" },
          hotel:    { label: "Hotel",    icon: "🏨", color: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/50" },
          school:   { label: "School",   icon: "🏫", color: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-900/50" },
          general:  { label: "Enterprise", icon: "🏢", color: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
        };
        const cfg = modeConfig[institutionMode] ?? modeConfig.hospital;
        return (
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold text-xs ${cfg.color}`}>
            <span>{cfg.icon}</span>
            <span>{cfg.label} Mode</span>
          </div>
        );
      })()}

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Total Scheduled</span>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">
            {bookings.length}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 block uppercase tracking-wider">Scheduled</span>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">
            {bookings.filter((b) => b.status === "Scheduled").length}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block uppercase tracking-wider">Confirmed</span>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">
            {bookings.filter((b) => b.status === "Confirmed").length}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 block uppercase tracking-wider">Completed</span>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">
            {bookings.filter((b) => b.status === "Completed").length}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${labels.clientLabel} or title...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-violet-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Bookings Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <RefreshCw className="h-8 w-8 text-violet-500 animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs">Loading appointments...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-full inline-block">
            <labels.icon className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No appointments found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Click "New Appointment" to create your first appointment in {institutionMode.toUpperCase()} mode.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBookings.map((b) => (
            <div
              key={b.id}
              className="group p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold border mb-1 ${labels.badgeColor}`}>
                      {institutionMode.toUpperCase()}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                      {b.title}
                    </h3>
                  </div>

                  {/* Status pill */}
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${
                      b.status === "Confirmed"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50"
                        : b.status === "Completed"
                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50"
                        : b.status === "Cancelled"
                        ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50"
                        : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50"
                    }`}
                  >
                    {b.status}
                  </span>
                </div>

                {/* Client / Patient details */}
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                    <User className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                    <span>{b.client_name}</span>
                  </div>

                  {b.client_phone && (
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Phone className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>{b.client_phone}</span>
                    </div>
                  )}

                  {b.resource_unit && (
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <MapPin className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                      <span>{b.resource_unit}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 pt-1">
                    <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span>{formatDateTime(b.start_time)}</span>
                  </div>
                </div>

                {b.assigned_staff && (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 text-xs flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-violet-500 shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                        {b.assigned_staff.full_name}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                        {b.assigned_staff.job_title || b.assigned_staff.role}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {b.status !== "Confirmed" && b.status !== "Completed" && (
                    <button
                      onClick={() => handleUpdateStatus(b.id, "Confirmed")}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-lg border border-emerald-200/60 transition-all"
                      title="Confirm Appointment (Triggers WhatsApp workflow)"
                    >
                      Confirm
                    </button>
                  )}
                  {b.status === "Confirmed" && (
                    <button
                      onClick={() => handleUpdateStatus(b.id, "Completed")}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 rounded-lg border border-blue-200/60 transition-all"
                    >
                      Complete
                    </button>
                  )}
                </div>

                {["superadmin", "admin", "manager"].includes(userRole) && (
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                    title="Delete"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Booking Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-violet-50 dark:bg-violet-950/40 text-violet-600 rounded-xl">
                  <labels.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  New {institutionMode.toUpperCase()} Appointment
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs rounded-xl">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateBooking} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  {labels.titleLabel} *
                </label>
                <input
                  type="text"
                  placeholder={labels.titlePlaceholder}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-violet-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    {labels.clientLabel} *
                  </label>
                  <input
                    type="text"
                    placeholder={labels.clientPlaceholder}
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-violet-500 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    WhatsApp Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +15550192"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-violet-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    {labels.staffLabel}
                  </label>
                  <select
                    value={assignedStaffId}
                    onChange={(e) => setAssignedStaffId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-slate-900 dark:text-slate-100"
                  >
                    <option value="">-- Select Staff Member --</option>
                    {staffMembers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} ({s.job_title || s.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    {labels.resourceLabel}
                  </label>
                  <input
                    type="text"
                    placeholder={labels.resourcePlaceholder}
                    value={resourceUnit}
                    onChange={(e) => setResourceUnit(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-violet-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Scheduled Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-violet-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Special Notes / Medical Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide additional details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-violet-500 text-slate-900 dark:text-slate-100 resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Scheduling...</span>
                    </>
                  ) : (
                    <span>Schedule Appointment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

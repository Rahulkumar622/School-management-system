import { useEffect, useState } from "react";

import api from "../api";
import { getAdminSession } from "../session";
import {
  hasLengthBetween,
  isNonNegativeNumber,
  isValidEmail,
  isValidPhone,
  isValidSchoolCode,
  normalizeEmail,
  normalizePhone,
  normalizeSchoolCode,
  normalizeText,
} from "../utils/validation";
import "../styles/appShell.css";

const createInitialSchoolForm = () => ({
  name: "",
  code: "",
  board: "",
  subscription_status: "active",
  max_students: "500",
  software_fee: "0",
  software_paid_amount: "0",
  last_payment_date: "",
  contact_email: "",
  contact_phone: "",
  address: "",
});

const initialAdminForm = {
  school_id: "",
  name: "",
  email: "",
  password: "",
};

const mapSchoolToForm = (school) => ({
  name: school.name || "",
  code: school.code || "",
  board: school.board || "",
  subscription_status: school.subscription_status || "active",
  max_students: String(school.max_students ?? 500),
  software_fee: String(Number(school.software_fee || 0)),
  software_paid_amount: String(Number(school.software_paid_amount || 0)),
  last_payment_date: school.last_payment_date ? String(school.last_payment_date).slice(0, 10) : "",
  contact_email: school.contact_email || "",
  contact_phone: school.contact_phone || "",
  address: school.address || "",
});

const sanitizeDigits = (value, maxLength) => String(value || "").replace(/\D/g, "").slice(0, maxLength);

const sanitizeDecimal = (value) => {
  const normalized = String(value || "").replace(/[^\d.]/g, "");
  const [integerPart = "", ...decimalParts] = normalized.split(".");
  const decimalPart = decimalParts.join("");
  return decimalParts.length ? `${integerPart}.${decimalPart.slice(0, 2)}` : integerPart;
};

const buildSchoolFormErrors = (schoolForm) => {
  const errors = {};

  if (!hasLengthBetween(schoolForm.name, 2, 120)) {
    errors.name = "School name 2 se 120 characters ke beech hona chahiye.";
  }

  if (!isValidSchoolCode(schoolForm.code)) {
    errors.code = "School code valid format me enter karo.";
  }

  if (!Number.isInteger(Number(schoolForm.max_students)) || Number(schoolForm.max_students) <= 0) {
    errors.max_students = "Student limit positive whole number hona chahiye.";
  }

  if (!isNonNegativeNumber(schoolForm.software_fee)) {
    errors.software_fee = "Software fee me sirf valid numbers allowed hain.";
  }

  if (!isNonNegativeNumber(schoolForm.software_paid_amount)) {
    errors.software_paid_amount = "Paid amount me sirf valid numbers allowed hain.";
  }

  if (schoolForm.contact_email && !isValidEmail(schoolForm.contact_email)) {
    errors.contact_email = "Valid contact email enter karo. Example: abc@gmail.com";
  }

  if (schoolForm.contact_phone && !isValidPhone(schoolForm.contact_phone)) {
    errors.contact_phone = "Contact phone me exactly 10 digits honi chahiye.";
  }

  return errors;
};

function SchoolManagement() {
  const adminSession = getAdminSession();
  const isSuperAdmin = adminSession?.role === "super_admin";
  const [schoolForm, setSchoolForm] = useState(createInitialSchoolForm);
  const [adminForm, setAdminForm] = useState(initialAdminForm);
  const [schools, setSchools] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [editingSchoolId, setEditingSchoolId] = useState(null);
  const [isSavingSchool, setIsSavingSchool] = useState(false);
  const [deletingSchoolId, setDeletingSchoolId] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [schoolFormErrors, setSchoolFormErrors] = useState({});
  const [adminFormErrors, setAdminFormErrors] = useState({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const [schoolsResponse, adminsResponse] = await Promise.all([
          api.get("/schools"),
          api.get("/admin-users", {
            params:
              adminSession?.role === "school_admin" && adminSession.school_id
                ? { schoolId: adminSession.school_id }
                : {},
          }),
        ]);

        const allSchools = schoolsResponse.data.schools || [];
        setSchools(
          adminSession?.role === "school_admin" && adminSession.school_id
            ? allSchools.filter((school) => Number(school.id) === Number(adminSession.school_id))
            : allSchools
        );
        setAdmins(adminsResponse.data.admins || []);
      } catch (requestError) {
        setStatus({
          type: "error",
          message: requestError.response?.data?.message || "Unable to load school management data.",
        });
      }
    };

    loadData();
  }, [adminSession?.role, adminSession?.school_id]);

  const billingSummary = schools.reduce(
    (summary, school) => {
      const totalFee = Number(school.software_fee || 0);
      const paidAmount = Number(school.software_paid_amount || 0);
      const dueAmount = Number(school.software_due_amount || 0);

      summary.totalFee += totalFee;
      summary.totalPaid += paidAmount;
      summary.totalDue += dueAmount;

      if (String(school.software_fee_status || "").toLowerCase() === "paid") {
        summary.paidSchools += 1;
      }

      if (dueAmount > 0) {
        summary.pendingSchools += 1;
      }

      return summary;
    },
    {
      totalFee: 0,
      totalPaid: 0,
      totalDue: 0,
      paidSchools: 0,
      pendingSchools: 0,
    }
  );

  const updateSchoolField = (field) => (event) => {
    const { value } = event.target;

    let nextValue = value;

    if (field === "contact_phone") {
      nextValue = sanitizeDigits(value, 10);
    }

    if (field === "max_students") {
      nextValue = sanitizeDigits(value, 6);
    }

    if (field === "software_fee" || field === "software_paid_amount") {
      nextValue = sanitizeDecimal(value);
    }

    setSchoolForm((current) => ({ ...current, [field]: nextValue }));
    setSchoolFormErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const updateAdminField = (field) => (event) => {
    setAdminForm((current) => ({ ...current, [field]: event.target.value }));
    setAdminFormErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const resetSchoolForm = () => {
    setSchoolForm(createInitialSchoolForm());
    setEditingSchoolId(null);
    setSchoolFormErrors({});
  };

  const refreshAdmins = async () => {
    const { data } = await api.get("/admin-users", {
      params:
        adminSession?.role === "school_admin" && adminSession.school_id
          ? { schoolId: adminSession.school_id }
          : {},
    });
    setAdmins(data.admins || []);
  };

  const handleSchoolSubmit = async (event) => {
    event.preventDefault();

    const errors = buildSchoolFormErrors(schoolForm);

    if (Object.keys(errors).length) {
      setSchoolFormErrors(errors);
      setStatus({ type: "error", message: Object.values(errors)[0] });
      return;
    }

    setIsSavingSchool(true);
    setStatus({ type: "", message: "" });
    setSchoolFormErrors({});

    try {
      const payload = {
        ...schoolForm,
        name: normalizeText(schoolForm.name),
        code: normalizeSchoolCode(schoolForm.code),
        board: normalizeText(schoolForm.board),
        max_students: Number(schoolForm.max_students),
        software_fee: Number(schoolForm.software_fee || 0),
        software_paid_amount: Number(schoolForm.software_paid_amount || 0),
        last_payment_date: schoolForm.last_payment_date || null,
        contact_email: normalizeEmail(schoolForm.contact_email),
        contact_phone: normalizePhone(schoolForm.contact_phone),
        address: normalizeText(schoolForm.address),
      };

      const { data } = editingSchoolId
        ? await api.patch(`/schools/${editingSchoolId}`, payload)
        : await api.post("/schools", payload);

      setSchools(data.schools || []);
      await refreshAdmins();
      resetSchoolForm();
      setStatus({ type: "success", message: data.message });
    } catch (requestError) {
      setStatus({
        type: "error",
        message:
          requestError.response?.data?.message ||
          (editingSchoolId ? "Unable to update school." : "Unable to create school."),
      });
    } finally {
      setIsSavingSchool(false);
    }
  };

  const handleEditSchool = (school) => {
    setEditingSchoolId(school.id);
    setSchoolForm(mapSchoolToForm(school));
    setSchoolFormErrors({});
    setStatus({ type: "", message: "" });
  };

  const handleDeleteSchool = async (school) => {
    const shouldDelete = window.confirm(
      `Delete ${school.name}? Is school ke students, teachers, parents, admissions aur payments bhi remove ho jayenge.`
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingSchoolId(school.id);
    setStatus({ type: "", message: "" });

    try {
      const { data } = await api.delete(`/schools/${school.id}`);
      setSchools(data.schools || []);
      await refreshAdmins();

      if (Number(editingSchoolId) === Number(school.id)) {
        resetSchoolForm();
      }

      setStatus({ type: "success", message: data.message });
    } catch (requestError) {
      setStatus({
        type: "error",
        message: requestError.response?.data?.message || "Unable to delete school.",
      });
    } finally {
      setDeletingSchoolId(null);
    }
  };

  const handleCreateAdmin = async (event) => {
    event.preventDefault();

    if (!adminForm.school_id) {
      setAdminFormErrors({ school_id: "School select karo." });
      setStatus({ type: "error", message: "School select karo." });
      return;
    }

    if (!hasLengthBetween(adminForm.name, 2, 80)) {
      setAdminFormErrors({ name: "Admin name 2 se 80 characters ke beech hona chahiye." });
      setStatus({ type: "error", message: "Admin name 2 se 80 characters ke beech hona chahiye." });
      return;
    }

    if (!isValidEmail(adminForm.email)) {
      setAdminFormErrors({ email: "Valid admin email enter karo. Example: abc@gmail.com" });
      setStatus({ type: "error", message: "Valid admin email enter karo." });
      return;
    }

    if (!hasLengthBetween(adminForm.password, 4, 64)) {
      setAdminFormErrors({ password: "Admin password 4 se 64 characters ke beech hona chahiye." });
      setStatus({ type: "error", message: "Admin password 4 se 64 characters ke beech hona chahiye." });
      return;
    }

    try {
      setAdminFormErrors({});
      const { data } = await api.post("/admin-users", {
        ...adminForm,
        name: normalizeText(adminForm.name),
        email: normalizeEmail(adminForm.email),
      });
      const schoolsResponse = await api.get("/schools");
      const adminsResponse = await api.get("/admin-users");
      const allSchools = schoolsResponse.data.schools || [];
      setSchools(allSchools);
      setAdmins(adminsResponse.data.admins || []);
      setAdminForm(initialAdminForm);
      setAdminFormErrors({});
      setStatus({ type: "success", message: data.message });
    } catch (requestError) {
      setStatus({
        type: "error",
        message: requestError.response?.data?.message || "Unable to create school admin.",
      });
    }
  };

  return (
    <div className="page-shell">
      <div className="page-card">
        <div className="page-header">
          <div>
            <h2>Client School Management</h2>
            <p>Manage schools, owner-side software billing, and school-admin accounts from one place.</p>
          </div>
        </div>

        {status.message ? <p className={`status-message ${status.type}`}>{status.message}</p> : null}

        {isSuperAdmin ? (
          <>
            <div className="card-grid" style={{ marginBottom: "24px" }}>
              <div className="info-card">
                <h3>Paid Schools</h3>
                <p className="metric">{billingSummary.paidSchools}</p>
              </div>
              <div className="info-card">
                <h3>Pending Fees</h3>
                <p className="metric">{billingSummary.pendingSchools}</p>
              </div>
              <div className="info-card">
                <h3>Collected</h3>
                <p className="metric">Rs. {billingSummary.totalPaid.toFixed(2)}</p>
              </div>
              <div className="info-card">
                <h3>Due Amount</h3>
                <p className="metric">Rs. {billingSummary.totalDue.toFixed(2)}</p>
              </div>
            </div>

            <div className="card-grid">
              <div className="info-card">
                <h3>{editingSchoolId ? "Edit School" : "Onboard New School"}</h3>
                <p className="empty-state" style={{ marginBottom: "16px" }}>
                  School details ke saath software fee, paid amount, due amount ka owner-side record bhi yahin maintain karo.
                </p>
                <form onSubmit={handleSchoolSubmit} noValidate>
                <div className="form-grid">
                  <div className="field-group">
                    <label htmlFor="school-name">School Name</label>
                    <input id="school-name" value={schoolForm.name} onChange={updateSchoolField("name")} />
                    {schoolFormErrors.name ? <small className="status-message error">{schoolFormErrors.name}</small> : null}
                  </div>
                  <div className="field-group">
                    <label htmlFor="school-code">School Code</label>
                    <input id="school-code" value={schoolForm.code} onChange={updateSchoolField("code")} />
                    {schoolFormErrors.code ? <small className="status-message error">{schoolFormErrors.code}</small> : null}
                  </div>
                  <div className="field-group">
                    <label htmlFor="school-board">Board</label>
                    <input id="school-board" value={schoolForm.board} onChange={updateSchoolField("board")} />
                  </div>
                  <div className="field-group">
                    <label htmlFor="school-status">Access Status</label>
                    <select
                      id="school-status"
                      value={schoolForm.subscription_status}
                      onChange={updateSchoolField("subscription_status")}
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="field-group">
                    <label htmlFor="school-max-students">Student Limit</label>
                    <input
                      id="school-max-students"
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      value={schoolForm.max_students}
                      onChange={updateSchoolField("max_students")}
                    />
                    {schoolFormErrors.max_students ? (
                      <small className="status-message error">{schoolFormErrors.max_students}</small>
                    ) : null}
                  </div>
                  <div className="field-group">
                    <label htmlFor="school-software-fee">Software Fee</label>
                    <input
                      id="school-software-fee"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={schoolForm.software_fee}
                      onChange={updateSchoolField("software_fee")}
                    />
                    {schoolFormErrors.software_fee ? (
                      <small className="status-message error">{schoolFormErrors.software_fee}</small>
                    ) : null}
                  </div>
                  <div className="field-group">
                    <label htmlFor="school-paid-amount">Paid Amount</label>
                    <input
                      id="school-paid-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={schoolForm.software_paid_amount}
                      onChange={updateSchoolField("software_paid_amount")}
                    />
                    {schoolFormErrors.software_paid_amount ? (
                      <small className="status-message error">{schoolFormErrors.software_paid_amount}</small>
                    ) : null}
                  </div>
                  <div className="field-group">
                    <label htmlFor="school-last-payment-date">Last Payment Date</label>
                    <input
                      id="school-last-payment-date"
                      type="date"
                      value={schoolForm.last_payment_date}
                      onChange={updateSchoolField("last_payment_date")}
                    />
                  </div>
                  <div className="field-group">
                    <label htmlFor="school-contact-email">Contact Email</label>
                    <input
                      id="school-contact-email"
                      type="email"
                      inputMode="email"
                      placeholder="abc@gmail.com"
                      value={schoolForm.contact_email}
                      onChange={updateSchoolField("contact_email")}
                    />
                    {schoolFormErrors.contact_email ? (
                      <small className="status-message error">{schoolFormErrors.contact_email}</small>
                    ) : null}
                  </div>
                  <div className="field-group">
                    <label htmlFor="school-contact-phone">Contact Phone</label>
                    <input
                      id="school-contact-phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength="10"
                      pattern="\d{10}"
                      placeholder="9876543210"
                      value={schoolForm.contact_phone}
                      onChange={updateSchoolField("contact_phone")}
                    />
                    {schoolFormErrors.contact_phone ? (
                      <small className="status-message error">{schoolFormErrors.contact_phone}</small>
                    ) : null}
                  </div>
                  <div className="field-group" style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="school-address">Address</label>
                    <input id="school-address" value={schoolForm.address} onChange={updateSchoolField("address")} />
                  </div>
                </div>
                <div className="button-row">
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={isSavingSchool}
                  >
                    {isSavingSchool
                      ? "Saving..."
                      : editingSchoolId
                        ? "Update School"
                        : "Create Client School"}
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={resetSchoolForm}
                    disabled={isSavingSchool}
                  >
                    {editingSchoolId ? "Cancel Edit" : "Reset"}
                  </button>
                </div>
                </form>
              </div>

              <div className="info-card">
                <h3>Create School Admin</h3>
                <form onSubmit={handleCreateAdmin} noValidate>
                <div className="form-grid">
                  <div className="field-group">
                    <label htmlFor="admin-school">School</label>
                    <select id="admin-school" value={adminForm.school_id} onChange={updateAdminField("school_id")}>
                      <option value="">Select School</option>
                      {schools.map((school) => (
                        <option key={school.id} value={school.id}>
                          {school.name} ({school.code})
                        </option>
                      ))}
                    </select>
                    {adminFormErrors.school_id ? <small className="status-message error">{adminFormErrors.school_id}</small> : null}
                  </div>
                  <div className="field-group">
                    <label htmlFor="admin-name">Name</label>
                    <input id="admin-name" value={adminForm.name} onChange={updateAdminField("name")} />
                    {adminFormErrors.name ? <small className="status-message error">{adminFormErrors.name}</small> : null}
                  </div>
                  <div className="field-group">
                    <label htmlFor="admin-email">Email</label>
                    <input
                      id="admin-email"
                      type="email"
                      inputMode="email"
                      placeholder="abc@gmail.com"
                      value={adminForm.email}
                      onChange={updateAdminField("email")}
                    />
                    {adminFormErrors.email ? <small className="status-message error">{adminFormErrors.email}</small> : null}
                  </div>
                  <div className="field-group">
                    <label htmlFor="admin-password">Password</label>
                    <input id="admin-password" type="password" value={adminForm.password} onChange={updateAdminField("password")} />
                    {adminFormErrors.password ? <small className="status-message error">{adminFormErrors.password}</small> : null}
                  </div>
                </div>
                <div className="button-row">
                  <button className="primary-button" type="submit">Create School Admin</button>
                </div>
                </form>
              </div>
            </div>
          </>
        ) : (
          <p className="empty-state">School admins can view their tenant information here, but only the software owner can create, edit, or delete schools.</p>
        )}

        <div className="info-card" style={{ marginTop: "24px" }}>
          <h3>Client Schools</h3>
          {schools.length ? (
            <div className="table-wrapper">
              <table className="data-table wide-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Access</th>
                    <th>Limit</th>
                    <th>Total Fee</th>
                    <th>Paid</th>
                    <th>Due</th>
                    <th>Fee Status</th>
                    <th>Last Payment</th>
                    <th>Email</th>
                    <th>Phone</th>
                    {isSuperAdmin ? <th>Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {schools.map((school) => (
                    <tr key={school.id}>
                      <td>{school.name}</td>
                      <td>{school.code}</td>
                      <td style={{ textTransform: "capitalize" }}>{school.subscription_status || "-"}</td>
                      <td>{school.max_students || "-"}</td>
                      <td>Rs. {Number(school.software_fee || 0).toFixed(2)}</td>
                      <td>Rs. {Number(school.software_paid_amount || 0).toFixed(2)}</td>
                      <td>Rs. {Number(school.software_due_amount || 0).toFixed(2)}</td>
                      <td style={{ textTransform: "capitalize" }}>{school.software_fee_status || "not_set"}</td>
                      <td>{school.last_payment_date ? String(school.last_payment_date).slice(0, 10) : "-"}</td>
                      <td>{school.contact_email || "-"}</td>
                      <td>{school.contact_phone || "-"}</td>
                      {isSuperAdmin ? (
                        <td className="actions-cell">
                          <div className="table-actions">
                            <button className="secondary-button" onClick={() => handleEditSchool(school)}>
                              Edit
                            </button>
                            <button
                              className="secondary-button"
                              onClick={() => handleDeleteSchool(school)}
                              disabled={deletingSchoolId === school.id}
                            >
                              {deletingSchoolId === school.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state">No schools created yet.</p>
          )}
        </div>

        <div className="info-card" style={{ marginTop: "24px" }}>
          <h3>School Admin Accounts</h3>
          {admins.length ? (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>School</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin.id}>
                      <td>{admin.name}</td>
                      <td>{admin.email}</td>
                      <td>{admin.role === "school_admin" ? "School Admin" : admin.role}</td>
                      <td>{admin.school_name || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state">No school admin accounts available yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default SchoolManagement;

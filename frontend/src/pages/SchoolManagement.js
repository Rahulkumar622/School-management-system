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
    setSchoolForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const updateAdminField = (field) => (event) => {
    setAdminForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const resetSchoolForm = () => {
    setSchoolForm(createInitialSchoolForm());
    setEditingSchoolId(null);
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

  const handleSchoolSubmit = async () => {
    if (!hasLengthBetween(schoolForm.name, 2, 120)) {
      setStatus({ type: "error", message: "School name 2 se 120 characters ke beech hona chahiye." });
      return;
    }

    if (!isValidSchoolCode(schoolForm.code)) {
      setStatus({ type: "error", message: "School code valid format me enter karo." });
      return;
    }

    if (!Number.isInteger(Number(schoolForm.max_students)) || Number(schoolForm.max_students) <= 0) {
      setStatus({ type: "error", message: "Student limit positive whole number hona chahiye." });
      return;
    }

    if (!isNonNegativeNumber(schoolForm.software_fee) || !isNonNegativeNumber(schoolForm.software_paid_amount)) {
      setStatus({ type: "error", message: "Software fee aur paid amount 0 ya usse zyada hone chahiye." });
      return;
    }

    if (schoolForm.contact_email && !isValidEmail(schoolForm.contact_email)) {
      setStatus({ type: "error", message: "Valid contact email enter karo." });
      return;
    }

    if (schoolForm.contact_phone && !isValidPhone(schoolForm.contact_phone)) {
      setStatus({ type: "error", message: "Contact phone me 10 se 15 digits honi chahiye." });
      return;
    }

    setIsSavingSchool(true);
    setStatus({ type: "", message: "" });

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

  const handleCreateAdmin = async () => {
    if (!adminForm.school_id) {
      setStatus({ type: "error", message: "School select karo." });
      return;
    }

    if (!hasLengthBetween(adminForm.name, 2, 80)) {
      setStatus({ type: "error", message: "Admin name 2 se 80 characters ke beech hona chahiye." });
      return;
    }

    if (!isValidEmail(adminForm.email)) {
      setStatus({ type: "error", message: "Valid admin email enter karo." });
      return;
    }

    if (!hasLengthBetween(adminForm.password, 4, 64)) {
      setStatus({ type: "error", message: "Admin password 4 se 64 characters ke beech hona chahiye." });
      return;
    }

    try {
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
                <div className="form-grid">
                  <div className="field-group">
                    <label>School Name</label>
                    <input value={schoolForm.name} onChange={updateSchoolField("name")} />
                  </div>
                  <div className="field-group">
                    <label>School Code</label>
                    <input value={schoolForm.code} onChange={updateSchoolField("code")} />
                  </div>
                  <div className="field-group">
                    <label>Board</label>
                    <input value={schoolForm.board} onChange={updateSchoolField("board")} />
                  </div>
                  <div className="field-group">
                    <label>Access Status</label>
                    <select
                      value={schoolForm.subscription_status}
                      onChange={updateSchoolField("subscription_status")}
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="field-group">
                    <label>Student Limit</label>
                    <input
                      type="number"
                      min="1"
                      value={schoolForm.max_students}
                      onChange={updateSchoolField("max_students")}
                    />
                  </div>
                  <div className="field-group">
                    <label>Software Fee</label>
                    <input
                      type="number"
                      min="0"
                      value={schoolForm.software_fee}
                      onChange={updateSchoolField("software_fee")}
                    />
                  </div>
                  <div className="field-group">
                    <label>Paid Amount</label>
                    <input
                      type="number"
                      min="0"
                      value={schoolForm.software_paid_amount}
                      onChange={updateSchoolField("software_paid_amount")}
                    />
                  </div>
                  <div className="field-group">
                    <label>Last Payment Date</label>
                    <input
                      type="date"
                      value={schoolForm.last_payment_date}
                      onChange={updateSchoolField("last_payment_date")}
                    />
                  </div>
                  <div className="field-group">
                    <label>Contact Email</label>
                    <input value={schoolForm.contact_email} onChange={updateSchoolField("contact_email")} />
                  </div>
                  <div className="field-group">
                    <label>Contact Phone</label>
                    <input value={schoolForm.contact_phone} onChange={updateSchoolField("contact_phone")} />
                  </div>
                  <div className="field-group" style={{ gridColumn: "1 / -1" }}>
                    <label>Address</label>
                    <input value={schoolForm.address} onChange={updateSchoolField("address")} />
                  </div>
                </div>
                <div className="button-row">
                  <button
                    className="primary-button"
                    onClick={handleSchoolSubmit}
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
                    onClick={resetSchoolForm}
                    disabled={isSavingSchool}
                  >
                    {editingSchoolId ? "Cancel Edit" : "Reset"}
                  </button>
                </div>
              </div>

              <div className="info-card">
                <h3>Create School Admin</h3>
                <div className="form-grid">
                  <div className="field-group">
                    <label>School</label>
                    <select value={adminForm.school_id} onChange={updateAdminField("school_id")}>
                      <option value="">Select School</option>
                      {schools.map((school) => (
                        <option key={school.id} value={school.id}>
                          {school.name} ({school.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field-group">
                    <label>Name</label>
                    <input value={adminForm.name} onChange={updateAdminField("name")} />
                  </div>
                  <div className="field-group">
                    <label>Email</label>
                    <input value={adminForm.email} onChange={updateAdminField("email")} />
                  </div>
                  <div className="field-group">
                    <label>Password</label>
                    <input type="password" value={adminForm.password} onChange={updateAdminField("password")} />
                  </div>
                </div>
                <div className="button-row">
                  <button className="primary-button" onClick={handleCreateAdmin}>Create School Admin</button>
                </div>
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

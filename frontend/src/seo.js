const DEFAULT_SITE_URL = "https://www.rahulschool.me";
const DEFAULT_IMAGE_PATH = "/logo512.png";
const DEFAULT_TITLE = "School Management System";
const DEFAULT_DESCRIPTION =
  "Role-based school ERP for admissions, attendance, marks, fees, and parent, student, teacher, and admin portals.";

const routeSeo = {
  "/": {
    title: "School Management System | Admissions, Portals, Fees, Attendance",
    description:
      "One school ERP for admissions, fee tracking, attendance, marks, and role-based portals for students, parents, teachers, and admins.",
    keywords:
      "school management system, school ERP, student portal, teacher portal, parent portal, online admission form",
    robots: "index, follow",
  },
  "/admission-form": {
    title: "Online Admission Form | School Management System",
    description:
      "Submit a new student admission request online and create parent portal access in one step.",
    keywords:
      "online school admission form, student admission, school registration, parent portal signup",
    robots: "index, follow",
  },
  "/student-login": {
    title: "Student Login | School Management System",
    description:
      "Student portal login for attendance, marks, fee status, and checkout access.",
    keywords: "student login, student portal, school ERP login",
    robots: "index, follow",
  },
  "/teacher-login": {
    title: "Teacher Login | School Management System",
    description:
      "Teacher portal login for attendance updates, marks entry, and classroom operations.",
    keywords: "teacher login, teacher portal, attendance management, marks entry",
    robots: "index, follow",
  },
  "/parent-login": {
    title: "Parent Portal Login | School Management System",
    description:
      "Parent portal login to track admissions, student performance, attendance, and fee updates.",
    keywords: "parent portal login, school parent app, fee updates, student performance",
    robots: "index, follow",
  },
  "/admin-login": {
    title: "Admin Login | School Management System",
    description:
      "Admin portal login for school operations, billing visibility, staff management, and reporting.",
    keywords: "admin login, school admin portal, school operations software",
    robots: "index, follow",
  },
};

const privateRoutePrefixMatches = [
  "/student-dashboard",
  "/student-checkout",
  "/teacher-dashboard",
  "/bulk-attendance",
  "/update-marks",
  "/mark-attendance",
  "/parent-dashboard",
  "/admin-dashboard",
  "/school-management",
  "/attendance-reports",
  "/marks-reports",
  "/payment-reports",
  "/add-student",
  "/add-teacher",
  "/view-reports",
  "/view-students",
];

const ensureMeta = (selector, attributes) => {
  let node = document.head.querySelector(selector);

  if (!node) {
    node = document.createElement("meta");
    document.head.appendChild(node);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    node.setAttribute(key, value);
  });
};

const ensureLink = (selector, attributes) => {
  let node = document.head.querySelector(selector);

  if (!node) {
    node = document.createElement("link");
    document.head.appendChild(node);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    node.setAttribute(key, value);
  });
};

const ensureJsonLdScript = (schema) => {
  const selector = 'script[data-seo="structured-data"]';
  let node = document.head.querySelector(selector);

  if (!node) {
    node = document.createElement("script");
    node.type = "application/ld+json";
    node.setAttribute("data-seo", "structured-data");
    document.head.appendChild(node);
  }

  node.textContent = JSON.stringify(schema);
};

const normalizeBaseUrl = () => {
  const envUrl = process.env.REACT_APP_SITE_URL?.trim();
  return (envUrl || window.location.origin || DEFAULT_SITE_URL).replace(/\/+$/, "");
};

const buildAbsoluteUrl = (baseUrl, path) => `${baseUrl}${path === "/" ? "/" : path}`;

const isPrivateRoute = (pathname) =>
  privateRoutePrefixMatches.some((routePath) => pathname.startsWith(routePath));

const buildSeoConfig = (pathname) => {
  if (isPrivateRoute(pathname)) {
    return {
      title: `${DEFAULT_TITLE} | Secure Portal`,
      description: DEFAULT_DESCRIPTION,
      keywords: "school management system, school ERP",
      robots: "noindex, nofollow",
    };
  }

  return (
    routeSeo[pathname] || {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      keywords: "school management system, school ERP, school portal",
      robots: "noindex, nofollow",
    }
  );
};

export const applySeo = (pathname) => {
  const baseUrl = normalizeBaseUrl();
  const seo = buildSeoConfig(pathname);
  const canonicalUrl = buildAbsoluteUrl(baseUrl, pathname);
  const imageUrl = `${baseUrl}${DEFAULT_IMAGE_PATH}`;

  document.title = seo.title;

  ensureMeta('meta[name="description"]', {
    name: "description",
    content: seo.description,
  });
  ensureMeta('meta[name="keywords"]', {
    name: "keywords",
    content: seo.keywords,
  });
  ensureMeta('meta[name="robots"]', {
    name: "robots",
    content: seo.robots,
  });
  ensureMeta('meta[property="og:type"]', {
    property: "og:type",
    content: "website",
  });
  ensureMeta('meta[property="og:title"]', {
    property: "og:title",
    content: seo.title,
  });
  ensureMeta('meta[property="og:description"]', {
    property: "og:description",
    content: seo.description,
  });
  ensureMeta('meta[property="og:url"]', {
    property: "og:url",
    content: canonicalUrl,
  });
  ensureMeta('meta[property="og:image"]', {
    property: "og:image",
    content: imageUrl,
  });
  ensureMeta('meta[property="og:site_name"]', {
    property: "og:site_name",
    content: DEFAULT_TITLE,
  });
  ensureMeta('meta[name="twitter:card"]', {
    name: "twitter:card",
    content: "summary_large_image",
  });
  ensureMeta('meta[name="twitter:title"]', {
    name: "twitter:title",
    content: seo.title,
  });
  ensureMeta('meta[name="twitter:description"]', {
    name: "twitter:description",
    content: seo.description,
  });
  ensureMeta('meta[name="twitter:image"]', {
    name: "twitter:image",
    content: imageUrl,
  });

  ensureLink('link[rel="canonical"]', {
    rel: "canonical",
    href: canonicalUrl,
  });

  ensureJsonLdScript({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: DEFAULT_TITLE,
    url: baseUrl,
    description: DEFAULT_DESCRIPTION,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
  });
};

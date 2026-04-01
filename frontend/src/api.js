// import axios from "axios";

// const resolveBaseUrl = () => {
//   const configuredUrl = process.env.REACT_APP_API_URL?.trim();

//   if (configuredUrl) {
//     return configuredUrl.replace(/\/+$/, "");
//   }

//   if (typeof window !== "undefined") {
//     const { hostname, origin } = window.location;

//     const API_URL = "https://school-backend-1289.onrender.com";
//      export default API_URL;

//     return origin;
//   }

//   return "";
// };

// const api = axios.create({
//   baseURL: resolveBaseUrl(),
// });

// export default api;


import axios from "axios";

const api = axios.create({
  baseURL: "https://school-backend-1289.onrender.com",
});

export default api;
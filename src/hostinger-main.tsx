import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import { getRouter } from "./router";
import "./styles.css";

const router = getRouter();

// The root route owns the complete html/head/body shell. Mounting that shell
// inside a div creates invalid nested document elements and makes mobile Safari
// replace focused form controls during updates.
createRoot(document).render(<RouterProvider router={router} />);

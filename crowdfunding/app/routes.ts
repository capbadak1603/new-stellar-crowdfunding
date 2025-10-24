import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    layout("routes/_layouts.tsx", [
        index("routes/home.tsx"),
        route("dashboard", "routes/campaign-dashboard.tsx"),
    ])
] satisfies RouteConfig;

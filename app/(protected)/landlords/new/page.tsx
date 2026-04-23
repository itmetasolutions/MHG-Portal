import { redirect } from "next/navigation";

// Landlords are now created exclusively via the /start/interested flow.
export default function LandlordsNewPage() {
  redirect("/start/interested");
}

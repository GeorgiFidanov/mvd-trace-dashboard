import { redirect } from "next/navigation";

export default function DataAccessPage() {
  redirect("/scenario-wizard?useCase=UC-E5");
}

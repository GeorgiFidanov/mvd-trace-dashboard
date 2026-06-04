import { redirect } from "next/navigation";

export default function CatalogPage() {
  redirect("/scenario-wizard?useCase=UC-E4");
}

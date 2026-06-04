import { redirect } from "next/navigation";

export default function NegotiationPage() {
  redirect("/scenario-wizard?useCase=UC-E3");
}

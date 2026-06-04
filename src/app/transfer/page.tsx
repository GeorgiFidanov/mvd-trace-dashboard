import { redirect } from "next/navigation";

export default function TransferPage() {
  redirect("/scenario-wizard?useCase=UC-E1");
}

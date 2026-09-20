import { SentEmailDetail } from "@/components/sent-email-detail";

export default async function SentEmailDetailPage({ params }: PageProps<"/dashboard/emails/[emailId]">) {
  const { emailId } = await params;
  return <SentEmailDetail emailId={emailId} />;
}

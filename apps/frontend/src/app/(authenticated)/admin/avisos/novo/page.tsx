import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/ui/page-header"
import { NoticeForm } from "@/features/notices/components/notice-form"

export default function AdminNovoAvisoPage() {
	return (
		<PageContainer as="section" width="wide">
			<PageHeader
				eyebrow="Admin"
				title="Novo aviso"
				subtitle="Comunicado enviado a todos os usuários pelo sino de notificações."
			/>
			<NoticeForm />
		</PageContainer>
	)
}

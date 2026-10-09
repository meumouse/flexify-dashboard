import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useConfirm } from '@/react/app/ConfirmProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { useRest, useWpData } from '@/react/app/WpDataProvider';
import { __, _n, sprintf } from '@/react/lib/i18n';
import { Button, Card, Input, Modal, Skeleton } from '@/react/ui';
import { generatePassword } from '@/react/features/users/UserModals';
import { useUserMutations, type User } from '@/react/features/users/queries';

/**
 * The password and the open sessions of one user, and the way out of the account.
 *
 * Sessions come from `users/{id}/sessions`, a route of the plugin: core keeps them behind the
 * profile screen's admin-ajax and has nothing in REST for them.
 */

type Sessions = { count: number; last_login: string | null };

const Row = ({ title, description, action }: { title: string; description: string; action: ReactNode }) => (
	// Wraps instead of squeezing: the danger zone sits in a third of the page, where the button
	// leaves the text a few words per line.
	<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-4 first:pt-0 last:pb-0">
		<div className="min-w-0 flex-1 basis-56">
			<p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">{title}</p>
			<p className="text-theme-xs text-gray-500 dark:text-gray-400">{description}</p>
		</div>
		<div className="shrink-0">{action}</div>
	</div>
);

export const SecurityCard = ({ user }: { user: User }) => {
	const rest = useRest();
	const confirm = useConfirm();
	const { notify } = useNotify();
	const { userId, loginUrl } = useWpData();
	const { save } = useUserMutations();
	const queryClient = useQueryClient();
	const [passwordOpen, setPasswordOpen] = useState(false);
	const [password, setPassword] = useState('');

	const sessionsKey = ['user-sessions', user.id];
	const sessions = useQuery({
		queryKey: sessionsKey,
		queryFn: ({ signal }) => rest.get<Sessions>(`flexify-dashboard/v1/users/${user.id}/sessions`, undefined, signal),
	});

	const signOut = useMutation({
		mutationFn: () => rest.remove<Sessions>(`flexify-dashboard/v1/users/${user.id}/sessions`),
		onSuccess: () => {
			// Ending your own sessions ends this one as well; the next request would be refused.
			if (user.id === userId) {
				window.location.href = loginUrl;
				return;
			}

			notify({ tone: 'success', title: __('Signed out of every device') });
			queryClient.invalidateQueries({ queryKey: sessionsKey });
		},
		onError: (error: Error) => notify({ tone: 'error', title: error.message }),
	});

	const askThenSignOut = async () => {
		const confirmed = await confirm({
			title: __('Sign out of every device?'),
			message: user.id === userId ? __('This includes this browser: you will be taken to the login screen.') : __('They will have to sign in again wherever they were.'),
			confirmLabel: __('Sign out everywhere'),
			variant: 'danger',
		});

		if (confirmed) {
			signOut.mutate();
		}
	};

	const openPassword = () => {
		setPassword(generatePassword());
		setPasswordOpen(true);
	};

	const savePassword = () =>
		save.mutate({ id: user.id, data: { password }, message: __('Password changed') }, { onSuccess: () => setPasswordOpen(false) });

	const count = sessions.data?.count ?? 0;
	const lastLogin = sessions.data?.last_login ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(sessions.data.last_login)) : '';

	return (
		<Card title={__('Security')}>
			<div className="divide-y divide-gray-100 dark:divide-gray-800">
				<Row
					title={__('Password')}
					description={__('Set a new one. The current password stops working at once.')}
					action={
						<Button variant="outline" size="sm" icon="key" onClick={openPassword}>
							{__('Change password')}
						</Button>
					}
				/>
				<Row
					title={__('Active sessions')}
					description={
						sessions.isLoading
							? __('Loading')
							: count
								? `${sprintf(_n('%d device signed in', '%d devices signed in', count), count)}${lastLogin ? ` · ${sprintf(__('latest %s'), lastLogin)}` : ''}`
								: __('Not signed in anywhere')
					}
					action={
						sessions.isLoading ? (
							<Skeleton className="h-10 w-32" />
						) : (
							<Button variant="outline" size="sm" icon="logout" disabled={!count} loading={signOut.isPending} onClick={askThenSignOut}>
								{__('Sign out everywhere')}
							</Button>
						)
					}
				/>
			</div>

			<Modal
				open={passwordOpen}
				onOpenChange={setPasswordOpen}
				size="sm"
				title={__('Change password')}
				description={__('Copy it now: it is not shown again after saving.')}
				footer={
					<>
						<Button variant="outline" onClick={() => setPasswordOpen(false)}>
							{__('Cancel')}
						</Button>
						<Button loading={save.isPending} disabled={password.length < 8} onClick={savePassword}>
							{__('Save password')}
						</Button>
					</>
				}
			>
				<div className="flex items-end gap-2">
					<Input
						label={__('New password')}
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						autoComplete="new-password"
						spellCheck={false}
						className="min-w-0 flex-1"
						error={password && password.length < 8 ? __('At least 8 characters.') : undefined}
					/>
					<Button variant="outline" icon="refresh" iconOnly aria-label={__('Generate another')} onClick={() => setPassword(generatePassword())} />
				</div>
			</Modal>
		</Card>
	);
};

/** The one thing on the page that cannot be taken back, kept apart from everything else. */
export const DangerZone = ({ onDelete }: { onDelete: () => void }) => (
	<Card title={__('Danger zone')} className="border-error-200 dark:border-error-500/30">
		<Row
			title={__('Delete this user')}
			description={__('Their account goes. You choose who keeps what they wrote.')}
			action={
				<Button variant="danger-outline" size="sm" icon="delete" onClick={onDelete}>
					{__('Delete user')}
				</Button>
			}
		/>
	</Card>
);

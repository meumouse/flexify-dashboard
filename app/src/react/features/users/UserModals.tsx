import { useState } from 'react';
import { useRest } from '@/react/app/WpDataProvider';
import { __, sprintf } from '@/react/lib/i18n';
import { Button, Field, Input, Modal, Select, Switch, Textarea } from '@/react/ui';
import { useUserMutations, type Role, type User } from '@/react/features/users/queries';

/**
 * Adding a person, and changing a few things about several at once.
 */

/** A password nobody has to think of, long enough that nobody has to think about it again. */
export const generatePassword = (length = 20): string => {
	const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*';
	const values = new Uint32Array(length);

	crypto.getRandomValues(values);

	return Array.from(values, (value) => alphabet[value % alphabet.length]).join('');
};

type CreateProps = {
	open: boolean;
	onClose: () => void;
	roles: Role[];
	onCreated: (user: User) => void;
};

export const CreateUserModal = ({ open, onClose, roles, onCreated }: CreateProps) => {
	const { create } = useUserMutations();
	const [form, setForm] = useState({ username: '', email: '', password: '', name: '', url: '', description: '', role: 'subscriber' });
	const [visible, setVisible] = useState(false);

	const complete = Boolean(form.username && form.email && form.password);

	const submit = () =>
		create.mutate(
			{
				username: form.username,
				email: form.email,
				password: form.password,
				name: form.name || form.username,
				url: form.url,
				description: form.description,
				roles: [form.role],
			},
			{
				onSuccess: (user) => {
					setForm({ username: '', email: '', password: '', name: '', url: '', description: '', role: 'subscriber' });
					onCreated(user);
					onClose();
				},
			}
		);

	return (
		<Modal
			open={open}
			onOpenChange={(next) => (next ? undefined : onClose())}
			title={__('Add a user')}
			footer={
				<>
					<Button variant="outline" onClick={onClose}>
						{__('Cancel')}
					</Button>
					<Button onClick={submit} loading={create.isPending} disabled={!complete}>
						{__('Add user')}
					</Button>
				</>
			}
		>
			<div className="flex flex-col gap-4">
				<Input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} autoComplete="off" label={__('Username')} />

				<Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="off" label={__('Email')} />

				<Field label={__('Password')} required hint={__('The user can change it after signing in.')}>
					<div className="flex items-center gap-2">
						<Input
							type={visible ? 'text' : 'password'}
							value={form.password}
							onChange={(event) => setForm({ ...form, password: event.target.value })}
							autoComplete="new-password"
							aria-label={__('Password')}
							className="flex-1"
						/>
						<Button variant="outline" size="sm" iconOnly icon={visible ? 'visibility_off' : 'visibility'} onClick={() => setVisible(!visible)} aria-label={__('Show password')} />
						<Button variant="outline" size="sm" icon="refresh" onClick={() => setForm({ ...form, password: generatePassword() })}>
							{__('Generate')}
						</Button>
					</div>
				</Field>

				<Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} label={__('Display name')} />

				<Select
						value={form.role}
						options={roles.map((role) => ({ value: role.slug, label: role.name }))}
						onChange={(event) => setForm({ ...form, role: event.target.value })} label={__('Role')} />

				<Input type="url" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} label={__('Website')} />

				<Textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} label={__('Biography')} />
			</div>
		</Modal>
	);
};

type BulkProps = {
	open: boolean;
	onClose: () => void;
	ids: number[];
	roles: Role[];
	onDone: () => void;
};

export const BulkEditUsersModal = ({ open, onClose, ids, roles, onDone }: BulkProps) => {
	const rest = useRest();
	const { bulk } = useUserMutations();
	const [role, setRole] = useState('');
	const [description, setDescription] = useState('');
	const [replaceBio, setReplaceBio] = useState(false);

	const data: Record<string, unknown> = {
		...(role ? { roles: [role] } : {}),
		...(replaceBio ? { description } : {}),
	};

	const hasChanges = Object.keys(data).length > 0;

	const save = () =>
		bulk.mutate(
			{ ids, action: (id) => rest.post(`wp/v2/users/${id}`, data), message: __('Users updated') },
			{
				onSuccess: () => {
					setRole('');
					setDescription('');
					setReplaceBio(false);
					onDone();
					onClose();
				},
			}
		);

	return (
		<Modal
			open={open}
			onOpenChange={(next) => (next ? undefined : onClose())}
			title={__('Edit users')}
			description={sprintf(__('%d user(s) will be changed. Fields left empty stay as they are.'), ids.length)}
			footer={
				<>
					<Button variant="outline" onClick={onClose}>
						{__('Cancel')}
					</Button>
					<Button onClick={save} loading={bulk.isPending} disabled={!hasChanges}>
						{__('Save changes')}
					</Button>
				</>
			}
		>
			<div className="flex flex-col gap-4">
				<Select
						value={role}
						placeholder={__('Leave unchanged')}
						options={roles.map((item) => ({ value: item.slug, label: item.name }))}
						onChange={(event) => setRole(event.target.value)} label={__('Role')} />

				<Switch checked={replaceBio} onCheckedChange={setReplaceBio} label={__('Replace the biography')} />

				{replaceBio ? <Textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} aria-label={__('Biography')} /> : null}
			</div>
		</Modal>
	);
};

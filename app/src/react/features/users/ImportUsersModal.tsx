import { useRef, useState } from 'react';
import { parseCSV } from '@/assets/js/functions/parseCSV.js';
import { useRest } from '@/react/app/WpDataProvider';
import { useNotify } from '@/react/app/ToastProvider';
import { __, sprintf } from '@/react/lib/i18n';
import { Alert, Button, Field, Icon, Modal, Select, Switch } from '@/react/ui';
import { generatePassword } from '@/react/features/users/UserModals';
import type { Role } from '@/react/features/users/queries';

/**
 * Bring people in from a spreadsheet.
 *
 * The columns of the file are whatever the other system called them, so the import says which
 * column means what, guessing from the headings and letting the guess be corrected.
 */

export const FIELDS = (): { value: string; label: string; required?: boolean }[] => [
	{ value: 'username', label: __('Username'), required: true },
	{ value: 'email', label: __('Email'), required: true },
	{ value: 'password', label: __('Password') },
	{ value: 'name', label: __('Display name') },
	{ value: 'first_name', label: __('First name') },
	{ value: 'last_name', label: __('Last name') },
	{ value: 'url', label: __('Website') },
	{ value: 'description', label: __('Biography') },
	{ value: 'roles', label: __('Roles') },
];

/**
 * Match the file's headings to the fields, by what they are called.
 *
 * "E-mail", "email address" and "Email" all mean the same column, and a person should not have
 * to say so when the heading already did.
 */
export const guessMapping = (headers: string[]): Record<string, string> => {
	const normalise = (value: string) => value.toLowerCase().replace(/[^a-z]/g, '');
	const aliases: Record<string, string[]> = {
		username: ['username', 'userlogin', 'login', 'user'],
		email: ['email', 'emailaddress', 'mail'],
		password: ['password', 'pass'],
		name: ['displayname', 'name', 'fullname'],
		first_name: ['firstname', 'givenname'],
		last_name: ['lastname', 'surname', 'familyname'],
		url: ['url', 'website', 'site'],
		description: ['description', 'bio', 'biography', 'about'],
		roles: ['roles', 'role'],
	};

	const mapping: Record<string, string> = {};

	headers.forEach((header) => {
		const normalised = normalise(header);
		const field = Object.entries(aliases).find(([, names]) => names.includes(normalised));

		if (field && !Object.values(mapping).includes(field[0])) {
			mapping[header] = field[0];
		}
	});

	return mapping;
};

type Props = {
	open: boolean;
	onClose: () => void;
	roles: Role[];
	onDone: () => void;
};

type Parsed = { headers: string[]; rows: Record<string, string>[] };

export const ImportUsersModal = ({ open, onClose, roles, onDone }: Props) => {
	const rest = useRest();
	const { notify } = useNotify();
	const fileInput = useRef<HTMLInputElement>(null);
	const [parsed, setParsed] = useState<Parsed | null>(null);
	const [mapping, setMapping] = useState<Record<string, string>>({});
	const [role, setRole] = useState('subscriber');
	const [useFileRoles, setUseFileRoles] = useState(false);
	const [running, setRunning] = useState(false);
	const [result, setResult] = useState<{ created: number; failed: string[] } | null>(null);

	const mapped = Object.values(mapping);
	const ready = mapped.includes('username') && mapped.includes('email');

	const read = async (file: File) => {
		try {
			const content = await file.text();
			const data = parseCSV(content, { delimiter: ',', hasHeaders: true }) as Parsed;

			setParsed(data);
			setMapping(guessMapping(data.headers));
			setResult(null);
		} catch {
			notify({ tone: 'error', title: __('That file could not be read.') });
		}
	};

	const rowToUser = (row: Record<string, string>) => {
		const user: Record<string, unknown> = {};

		Object.entries(mapping).forEach(([header, field]) => {
			const value = (row[header] ?? '').trim();

			if (!value) {
				return;
			}

			if (field === 'roles') {
				user.roles = value.split(/[;,]/).map((item) => item.trim()).filter(Boolean);
				return;
			}

			user[field] = value;
		});

		if (!useFileRoles || !user.roles) {
			user.roles = [role];
		}

		// Somebody has to have a password, and one nobody knows is safer than one everybody does.
		if (!user.password) {
			user.password = generatePassword();
		}

		return user;
	};

	/** One request per row, in sequence: the point is to know which row failed and why. */
	const run = async () => {
		if (!parsed) {
			return;
		}

		setRunning(true);

		let created = 0;
		const failed: string[] = [];

		for (const [index, row] of parsed.rows.entries()) {
			try {
				await rest.post('wp/v2/users', rowToUser(row));
				created += 1;
			} catch (error) {
				failed.push(sprintf(__('Row %1$s: %2$s'), String(index + 2), (error as Error).message));
			}
		}

		setRunning(false);
		setResult({ created, failed });
		onDone();

		if (created) {
			notify({ tone: 'success', title: sprintf(__('%d user(s) imported'), created) });
		}
	};

	const close = () => {
		setParsed(null);
		setMapping({});
		setResult(null);
		onClose();
	};

	return (
		<Modal
			open={open}
			onOpenChange={(next) => (next ? undefined : close())}
			title={__('Import users')}
			size="lg"
			footer={
				<>
					<Button variant="outline" onClick={close}>
						{result ? __('Close') : __('Cancel')}
					</Button>
					<Button onClick={run} loading={running} disabled={!parsed || !ready || Boolean(result)}>
						{parsed ? sprintf(__('Import %d row(s)'), parsed.rows.length) : __('Import')}
					</Button>
				</>
			}
		>
			<input
				ref={fileInput}
				type="file"
				accept=".csv,text/csv"
				className="hidden"
				aria-hidden
				tabIndex={-1}
				onChange={(event) => {
					const file = event.target.files?.[0];
					event.target.value = '';

					if (file) {
						read(file);
					}
				}}
			/>

			{!parsed ? (
				<button
					type="button"
					onClick={() => fileInput.current?.click()}
					className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-10 text-center transition-colors hover:border-brand-400 dark:border-gray-700"
				>
					<Icon name="upload_file" className="text-3xl text-gray-400" />
					<span className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">{__('Choose a CSV file')}</span>
					<span className="text-theme-xs text-gray-500 dark:text-gray-400">{__('The first row has to be the column headings.')}</span>
				</button>
			) : result ? (
				<div className="flex flex-col gap-4">
					<Alert variant={result.failed.length ? 'warning' : 'success'} title={sprintf(__('%d user(s) imported'), result.created)} />

					{result.failed.length ? (
						<div>
							<p className="mb-2 text-theme-sm font-medium text-gray-700 dark:text-gray-300">{sprintf(__('%d row(s) were not imported'), result.failed.length)}</p>
							<ul className="max-h-48 space-y-1 overflow-y-auto text-theme-xs text-gray-500 dark:text-gray-400">
								{result.failed.map((line) => (
									<li key={line}>{line}</li>
								))}
							</ul>
						</div>
					) : null}
				</div>
			) : (
				<div className="flex flex-col gap-4">
					<p className="text-theme-sm text-gray-600 dark:text-gray-400">{sprintf(__('%1$s columns, %2$s rows.'), String(parsed.headers.length), String(parsed.rows.length))}</p>

					<div className="max-h-64 overflow-y-auto">
						<table className="w-full text-theme-sm">
							<thead>
								<tr className="text-start text-theme-xs uppercase tracking-wide text-gray-400">
									<th className="py-2 text-start font-medium">{__('Column in the file')}</th>
									<th className="py-2 text-start font-medium">{__('Means')}</th>
								</tr>
							</thead>
							<tbody>
								{parsed.headers.map((header) => (
									<tr key={header}>
										<td className="py-1.5 pe-4 align-middle">
											<span className="block truncate text-gray-700 dark:text-gray-300">{header}</span>
											<span className="block truncate text-theme-xs text-gray-400">{parsed.rows[0]?.[header]}</span>
										</td>
										<td className="py-1.5">
											<Select
												size="sm"
												value={mapping[header] ?? ''}
												placeholder={__('Ignore')}
												options={FIELDS().map((field) => ({ value: field.value, label: field.label }))}
												onChange={(event) => setMapping({ ...mapping, [header]: event.target.value })}
												aria-label={sprintf(__('What %s means'), header)}
											/>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{!ready ? <Alert variant="warning" title={__('A username column and an email column are needed.')} /> : null}

					<Switch checked={useFileRoles} onCheckedChange={setUseFileRoles} label={__('Use the roles in the file')} />

					{!useFileRoles ? (
						<Field label={__('Role for everyone imported')}>
							<Select value={role} options={roles.map((item) => ({ value: item.slug, label: item.name }))} onChange={(event) => setRole(event.target.value)} />
						</Field>
					) : null}
				</div>
			)}
		</Modal>
	);
};

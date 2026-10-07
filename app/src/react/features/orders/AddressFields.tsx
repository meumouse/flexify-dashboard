import { __ } from '@/react/lib/i18n';
import { Input, Select } from '@/react/ui';
import { useCountries } from '@/react/woo/queries';
import type { Address } from '@/react/woo/types';

/**
 * Address form in the `wc/v3` shape, used for both billing and shipping.
 */

type Props = {
	address: Address;
	onChange: (address: Address) => void;
	/** The email field only exists on the billing address */
	type?: 'billing' | 'shipping';
};

export const AddressFields = ({ address, onChange, type = 'billing' }: Props) => {
	const { data: countries = [] } = useCountries();

	const countryOptions = countries.map((country) => ({ value: country.code, label: country.name }));
	const stateOptions = (countries.find((country) => country.code === address.country)?.states ?? []).map((state) => ({ value: state.code, label: state.name }));

	const set = (field: keyof Address, value: string) => onChange({ ...address, [field]: value });

	return (
		<div className="grid gap-4 sm:grid-cols-2">
			<Input value={address.first_name} onChange={(event) => set('first_name', event.target.value)} label={__('First name')} autoComplete="off" />
			<Input value={address.last_name} onChange={(event) => set('last_name', event.target.value)} label={__('Last name')} autoComplete="off" />
			<Input value={address.company} onChange={(event) => set('company', event.target.value)} className="sm:col-span-2" label={__('Company')} autoComplete="off" />
			<Input value={address.address_1} onChange={(event) => set('address_1', event.target.value)} className="sm:col-span-2" label={__('Address line 1')} autoComplete="off" />
			<Input value={address.address_2} onChange={(event) => set('address_2', event.target.value)} className="sm:col-span-2" label={__('Address line 2')} autoComplete="off" />
			<Select
				value={address.country}
				// Changing the country invalidates the state, which is a list of that country.
				onChange={(event) => onChange({ ...address, country: event.target.value, state: '' })}
				options={countryOptions}
				label={__('Country / Region')}
				placeholder={__('Select a country')}
			/>
			{stateOptions.length ? (
				<Select value={address.state} onChange={(event) => set('state', event.target.value)} options={stateOptions} label={__('State / County')} placeholder={__('Select a state')} />
			) : (
				<Input value={address.state} onChange={(event) => set('state', event.target.value)} label={__('State / County')} autoComplete="off" />
			)}
			<Input value={address.city} onChange={(event) => set('city', event.target.value)} label={__('City')} autoComplete="off" />
			<Input value={address.postcode} onChange={(event) => set('postcode', event.target.value)} label={__('Postcode / ZIP')} autoComplete="off" />
			{type === 'billing' ? (
				<Input value={address.email ?? ''} onChange={(event) => set('email', event.target.value)} type="email" label={__('Email address')} autoComplete="off" />
			) : null}
			<Input value={address.phone} onChange={(event) => set('phone', event.target.value)} type="tel" label={__('Phone')} autoComplete="off" />
		</div>
	);
};

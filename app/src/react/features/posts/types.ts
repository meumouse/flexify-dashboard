/**
 * What the hidden posts page answers with.
 *
 * The plugin runs the real `WP_List_Table` on a page of its own and prints the result as
 * JSON, so columns, views and row actions are whatever the site's plugins made them —
 * the screen renders what it is given instead of deciding what a post type looks like.
 */

export type PostTitle = { value: string; image_url?: string | null };

export type PostStatus = { value: string; label: string };

export type PostAuthor = { id: number; name: string; avatar?: string; url?: string };

export type PostTerm = { id: number; title: string; url: string };

export type RowAction = { key: string; url: string; text: string; html: string };

export type PostRow = {
	id: number;
	title: PostTitle;
	type: string;
	rest_base: string;
	edit_url: string;
	view_url: string;
	single_status: string;
	is_editable: boolean;
	row_actions: RowAction[];
	children: PostRow[];
	depth: number;
	cell_classes: Record<string, string>;
	status?: PostStatus;
	author?: PostAuthor;
	date?: string;
	/** Any other column the site added, already rendered by WordPress */
	[column: string]: unknown;
};

export type PostColumn = {
	key: string;
	label: string;
	active: boolean;
	/** Columns WordPress can order by; the others are display only */
	sort_key: string | false;
};

export type PostView = {
	value: string;
	label: string;
	count: number;
	current: boolean;
	query_params: Record<string, string | string[]>;
};

export type PostsPayload = {
	items: PostRow[];
	total: number;
	pages: number;
	columns: Record<string, PostColumn>;
	column_classes: Record<string, string[]>;
	custom_styles: { handle: string; src: string }[];
	views: Record<string, PostView>;
};

export type PostTypeObject = {
	name: string;
	rest_base: string;
	labels?: { name?: string; search_items?: string; new_item?: string; add_new_item?: string };
};

export type PostsQuery = {
	post_type: string;
	search: string;
	page: number;
	per_page: number;
	orderby: string;
	order: 'ASC' | 'DESC';
	view: string;
	categories: number[];
	start_date: string;
	end_date: string;
};

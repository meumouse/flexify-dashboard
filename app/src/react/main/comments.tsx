import '@/apps/css/comments.css';

import { mountApp } from '@/react/app/mount';
import { CommentsApp } from '@/react/features/comments/CommentsApp';

mountApp('fd-comments-page', <CommentsApp />, '#fd-comments-script');

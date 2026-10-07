import '@/apps/css/posts.css';

import { mountApp } from '@/react/app/mount';
import { PostsApp } from '@/react/features/posts/PostsApp';

mountApp('fd-posts-page', <PostsApp />, '#fd-posts-script');

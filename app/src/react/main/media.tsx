import '@/apps/css/media.css';

import { mountApp } from '@/react/app/mount';
import { MediaApp } from '@/react/features/media/MediaApp';

mountApp('fd-media-page', <MediaApp />, '#fd-media-script');

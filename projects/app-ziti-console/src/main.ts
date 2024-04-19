import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import NoExist from './app/no-exist';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));

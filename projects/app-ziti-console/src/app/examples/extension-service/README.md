# Extension Service

Below is an example of how to define and use an extension service.

In the file `example-extension.service.ts` is an exported class that implements the `ExtensionService` interface.

Each create/edit form (ie. `identity-form.component.ts`, `edge-router-form.component.ts` etc...) injects an instance of an `ExtensionService` implementation.

To use a specific implementation of an extension service, you must define a provider for it in `app.module.ts`. See below for an example of how to do this: 

```
// In the "providers" secion of app.module.ts, use the relevant injection token to decalre which instance of the extesnsion service to provide

import { ExampleExtensionService } from "./examples/extension-service/example-extension.service";

@NgModule({
    declarations: [AppComponent],
    providers: [
        // Here we can chose to use the example-extension.service.ts
        { provide: EDGE_ROUTER_EXTENSION_SERVICE, useClass: ExampleExtensionService },
    ]
})
```

In `example-extension.service.ts` are examples of how the various properties, functions, and events are defined. If you open the EdgeRouter create/edit form
(either by clicking on an existing router from the list page, or by adding a new one), you should then see the "Edit Form Action" item display as an option in the "More Actions" dropdown
import {
    HttpInterceptor,
    HttpHandler,
    HttpEvent,
    HttpRequest
} from '@angular/common/http';
import {Observable} from 'rxjs';

export class NoopHttpInterceptor implements HttpInterceptor {

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(req);
    }
};
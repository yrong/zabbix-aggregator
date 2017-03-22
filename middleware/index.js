'use strict';

import compose from 'koa-compose';
import checkToken from './checkToken';
import responseWrapper from './responseWrapper';

export default function middleware() {
    return compose(
        [
            responseWrapper(),
            checkToken()
        ]
    )
}

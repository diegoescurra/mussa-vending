import { Passport } from 'passport';
import { Strategy } from 'passport-local';
import { authenticate } from './auth.service.js';
import { findSessionUser } from './auth.repository.js';
import type { SessionIdentity } from './auth.types.js';

export const passport = new Passport();
passport.use(
  new Strategy({ usernameField: 'email' }, (email, password, done) => {
    authenticate(email.trim().toLowerCase(), password).then((user) => done(null, user), done);
  }),
);
passport.serializeUser<SessionIdentity>((user, done) => {
  done(null, { id: user.id_usuario, version: user.auth_version });
});
passport.deserializeUser<SessionIdentity>((identity, done) => {
  findSessionUser(identity.id).then((user) => {
    done(null, user?.estado && user.auth_version === identity.version ? user : false);
  }, done);
});

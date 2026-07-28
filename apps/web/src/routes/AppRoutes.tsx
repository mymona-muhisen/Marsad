import { Route, Routes } from 'react-router'

import { AppShell } from '@/components/layout/AppShell'
import { LandingPage } from '@/components/landing/LandingPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { HomePage } from '@/features/home/HomePage'
import { PlaceholderSection } from '@/features/home/PlaceholderSection'
import { SECTIONS } from '@/features/home/sections'
import { VerifyReportPage } from '@/features/verify/VerifyReportPage'
import { RequireAuth, RequireRole } from './guards'
import { NotFoundPage } from './NotFoundPage'

/**
 * Route map. The authenticated sections are generated from the same registry
 * the home screen lists, so a section can never be linked without a guard or
 * guarded without being reachable.
 */
export function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify" element={<VerifyReportPage />} />
      <Route path="/verify/:qrToken" element={<VerifyReportPage />} />

      {/* Authenticated */}
      <Route element={<RequireAuth />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<HomePage />} />

          {SECTIONS.map((section) => (
            <Route
              key={section.path}
              element={<RequireRole allowed={section.roles} />}
            >
              <Route
                path={section.path}
                element={<PlaceholderSection sectionId={section.id} />}
              />
            </Route>
          ))}
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

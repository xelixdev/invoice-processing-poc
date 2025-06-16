'use client'

import Sidebar from "@/components/sidebar"
import MainHeader from "@/components/main-header"

export default function SettingsPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar activePage="settings" />
      <div className="flex-1 flex flex-col">
        <MainHeader activePage="invoices" invoicesHref="/settings" />
        <main className="flex-1 pt-3 px-6 pb-6 overflow-auto">
          <div>
            <div className="mb-8">
              {/* Second layer navigation tabs */}
              <div className="mb-6">
                <nav className="flex space-x-8">
                  <button className="py-2 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm">
                    General
                  </button>
                  <button className="py-2 px-1 border-b-2 border-primary text-primary font-medium text-sm">
                    Approval Rules
                  </button>
                </nav>
              </div>
              
              <h1 className="text-2xl font-semibold mb-6">Approval Rules</h1>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <p className="text-gray-600">Approval Rules content will go here.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
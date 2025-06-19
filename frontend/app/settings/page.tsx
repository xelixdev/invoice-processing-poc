'use client'

import { useState } from 'react'
import Sidebar from "@/components/sidebar"
import MainHeader from "@/components/main-header"
import ApprovalRulesTable from "@/components/approval-rules-table"
import RuleBuilderModal from "@/components/rule-builder-modal"
import SLAConfiguration from "@/components/sla-configuration"
import { Search, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('approval-rules')
  const [searchQuery, setSearchQuery] = useState('')
  const [isRuleBuilderOpen, setIsRuleBuilderOpen] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleCreateRule = () => {
    setEditingRule(null)
    setIsRuleBuilderOpen(true)
  }

  const handleEditRule = (rule: any) => {
    setEditingRule(rule)
    setIsRuleBuilderOpen(true)
  }

  const handleCloseRuleBuilder = () => {
    setIsRuleBuilderOpen(false)
    setEditingRule(null)
  }

  const handleRuleSaved = () => {
    // Trigger a refresh of the rules table
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activePage="settings" />
      <div className="flex-1 flex flex-col">
        <MainHeader activePage="invoices" />
        <main className="flex-1 pt-3 px-6 pb-6 overflow-auto">
          <div>
            <div className="mb-8">
              {/* Second layer navigation tabs */}
              <div className="mb-6">
                <nav className="flex space-x-8">
                  <button 
                    onClick={() => setActiveTab('general')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'general' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    General
                  </button>
                  <button 
                    onClick={() => setActiveTab('approval-rules')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'approval-rules' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Approval Rules
                  </button>
                  <button 
                    onClick={() => setActiveTab('sla-configuration')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'sla-configuration' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    SLA Configuration
                  </button>
                </nav>
              </div>
              
              {/* Dynamic header based on active tab */}
              {activeTab === 'approval-rules' && <h1 className="text-2xl font-semibold mb-6">Approval Rules</h1>}
              {activeTab === 'sla-configuration' && <h1 className="text-2xl font-semibold mb-6">SLA Configuration</h1>}
              {activeTab === 'general' && <h1 className="text-2xl font-semibold mb-6">General Settings</h1>}
            </div>
            
            {/* Tab Content */}
            {activeTab === 'approval-rules' && (
              <div className="space-y-4">
                {/* Search and Create Button */}
                <div className="flex items-center justify-between">
                  <div className="relative w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="search"
                      placeholder="Search rules..."
                      className="pl-10 bg-white"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleCreateRule}
                    className="bg-violet-600 hover:bg-violet-700 flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create New Rule
                  </Button>
                </div>

                {/* Rules Table */}
                <ApprovalRulesTable searchQuery={searchQuery} onEditRule={handleEditRule} refreshTrigger={refreshTrigger} />
              </div>
            )}

            {activeTab === 'sla-configuration' && (
              <SLAConfiguration />
            )}

            {activeTab === 'general' && (
              <div className="space-y-4">
                <p className="text-gray-600">General settings will be configured here.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Rule Builder Modal */}
      <RuleBuilderModal
        isOpen={isRuleBuilderOpen}
        onClose={handleCloseRuleBuilder}
        editingRule={editingRule}
        onRuleSaved={handleRuleSaved}
      />
    </div>
  )
}
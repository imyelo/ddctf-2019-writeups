# -*- coding: UTF-8 -*-

# sandbox ---
class request:
	event_queue = []

session = {}
session['num_items'] = 0
session['points'] = 3

request.prev_session = dict(session)


# utils ---
def FLAG():
	return 'FLAG_is_here_but_i_wont_show_you'  # censored

def get_mid_str(haystack, prefix, postfix=None):
	haystack = haystack[haystack.find(prefix)+len(prefix):]
	if postfix is not None:
		haystack = haystack[:haystack.find(postfix)]
	return haystack


# handlers and functions ---
def view_handler(args):
	return 'View'

def show_flag_function(args):
	return 'Anyway, we will catch via session.log.'
	
def get_flag_handler(args):
	if session['num_items'] >= 5:
		trigger('func:show_flag;' + FLAG()) # show_flag_function has been disabled, no worries
	trigger('action:view;index')

def buy_handler(args):
	num_items = int(args[0])
	if num_items <= 0: return 'invalid number({}) of diamonds to buy<br />'.format(args[0])
	session['num_items'] += num_items 
	trigger(['func:consume_point;{}'.format(num_items), 'action:view;'])

def consume_point_function(args):
	point_to_consume = int(args[0])
	if session['points'] < point_to_consume: raise RollBackException()
	session['points'] -= point_to_consume


# framework ---
def entry(event):
	trigger(event)
	execute()

def trigger(event):
	print '[Trigger] Pushing event: '
	print event
	print ''
	if type(event) == type([]):
		request.event_queue += event
	else:
		request.event_queue.append(event)

def execute():
	valid_event_chars = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789:;#')
	ret_val = None
	while len(request.event_queue) > 0:
		event = request.event_queue[0] # `event` is something like "action:ACTION;ARGS0#ARGS1#ARGS2......"
		print '[Loop] Trying to execute: ' + event
		request.event_queue = request.event_queue[1:]
		if not event.startswith(('action:', 'func:')): continue
		for c in event:
			if c not in valid_event_chars: break
		else:
			is_action = event[0] == 'a'
			action = get_mid_str(event, ':', ';')
			args = get_mid_str(event, action+';').split('#')
			try:
				event_handler = eval(action + ('_handler' if is_action else '_function'))
				ret_val = event_handler(args)
			except RollBackException:
				print '[Loop] ROLLING BACK'
				session['num_items'] = request.prev_session['num_items']
				session['points'] = request.prev_session['points']
				break
			except Exception, e:
				print Exception, e
	if ret_val is not None:
		print '[[Response]] ACCEPTED: ' + ret_val
	else:
		print '[[Response]] DENIED'

class RollBackException: pass


# playground ---
def main():
	print '--- SERVER UP ---'
	# entry('action:view;3') # work
	# entry('action:eval#;FLAG()') # denied
	# entry('action:buy;3') # work
	# entry('action:buy;999') # denied, rollback
	# entry('action:trigger#;action:buy;3') # work
	entry('action:trigger#;action:buy;999#action:get_flag;') # denied, rollback, but show_flag_functions executed
	print '--- SERVER DOWN ---'
	print 'Result:'
	print session

main()

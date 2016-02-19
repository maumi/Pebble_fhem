################################################################
# Maintainer: _Markus_
# examples:
# pebble        - returns name, room, alias, and state of all devices in given room
################################################################

package main;
use strict;
use warnings;
use POSIX;

sub CommandPebble($$);
sub JsonEscape($);
sub PrintHashJson($$);


#####################################
sub
Pebble_Initialize($$)
{
  my %lhash = ( Fn=>"CommandPebble" );
  $cmds{pebble} = \%lhash;
}


#####################################
sub
JsonEscape($)
{
  my $a = shift;
  return "null" if(!$a);
  my %esc = (
    "\n" => '\n',
    "\r" => '\r',
    "\t" => '\t',
    "\f" => '\f',
    "\b" => '\b',
    "\"" => '\"',
    "\\" => '\\\\',
    "\'" => '\\\'',
  );
  $a =~ s/([\x22\x5c\n\r\t\f\b])/$esc{$1}/eg;
  return $a;
}



#####################################
sub copyDeviceValues($) {
	my ($d) = @_;
	
	my %ret;
	%ret = (
		name => $d,
		alias => $attr{$d}{alias},
		room => $attr{$d}{room},	
		group => $attr{$d}{group},
		webCmd => $attr{$d}{webCmd},
		pebbleCmd => $attr{$d}{pebbleCmd},	
		pebbleOrder => $attr{$d}{pebbleOrder},
		pebbleReadOnly => $attr{$d}{pebbleReadOnly},	
		pebbleHide => $attr{$d}{pebbleHide},
		type => $defs{$d}{TYPE},	
		state => $defs{$d}{STATE}
	);
	
	return \%ret;

}


sub CommandPebble($$) {

	my ($cl, $param) = @_;
	
	# Result counter
	my $c = 0;
	
	# Collect all the stuff together:
	my %devs;
	foreach my $d (keys %attr) {
		next if (!defined($attr{$d}{room}) or $attr{$d}{room} eq "" or $attr{$d}{room} eq "null");
		my @rs = split(",", $attr{$d}{room});
		foreach my $r (@rs) {
			if($r && $r =~ m/$param/ && $r ne "hidden") {
				my $g = $attr{$d}{group};
				if(!$g) {
					$devs{$r}{'General'}{$d} = copyDeviceValues($d);
				} else {
					map { $devs{$r}{$_}{$d} =  copyDeviceValues($d)  } split(",", $g);
				}
			}
		}
	}
	
	# now, let's do some reformating to match pebble input format
	my @rooms;
	map { 
		my @groups;
		my $room = $_;
		map {
			my @devices;
			my $group = $_;
			map {
				my $device = $_;
				my $title = $device; $title =~ s/_/ /g;
				my %d = (
					title => $title,
					subtitle => ''
				);
				$d{$_} = $devs{$room}{$group}{$device}{$_} for keys %{$devs{$room}{$group}{$device}};
				$d{title} = $d{alias} if($d{alias});
				$d{pebbleCmd} = $d{webCmd} if(!$d{pebbleCmd});
				$d{pebbleCmd} = 'on:off' if(!$d{pebbleCmd});
				$d{pebbleOrder} = -1 if(!$d{pebbleOrder});
				$d{pebbleHide} = 0 if(!$d{pebbleHide});
				$d{pebbleReadOnly} = 0 if(!$d{pebbleReadOnly});
				$d{subtitle} = 'Status: ' . $d{state} if($d{state});
				$d{alias} = $d{name} if(!$d{alias});
				push @devices, \%d;
				$c = $c + scalar keys @devices;
			} (sort keys $devs{$room}{$group});
			my @sorted_devices = sort { $a->{title} cmp $b->{title} } @devices;
			my @sorted_devices = sort { $a->{pebbleOrder} cmp $b->{pebbleOrder} } @sorted_devices;
			my $title = $group; $title =~ s/_/ /g;
			my %g = (
				title => $title,
				subtitle => '',
				items => \@sorted_devices
			);
			push @groups, \%g;
		} (sort keys $devs{$room});
		my @sorted_groups = sort { $a->{pebbleOrder} cmp $b->{pebbleOrder} } @groups;
		my $title = $room; $title =~ s/_/ /g;
		my %r = (
			title => $title, 
			subtitle => '', 
			groups => \@groups
		); 
		push @rooms, \%r;
	} (sort keys %devs);
	my @sorted_rooms = sort { $a->{pebbleOrder} cmp $b->{pebbleOrder} } @rooms;
  
	my %res = ( ResultSet => "room#$param", rooms => \@rooms, totalResultsReturned => $c );

	# now lets convert to json
	my $json = JSON->new;
	my $ret = $json->pretty->encode( \%res );
	return $ret;
	
	
}
1;
